const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');

// Validation schema
const orderSchema = Joi.object({
  tableNumber: Joi.number().integer().min(1).max(100).required(),
  items: Joi.array().items(
    Joi.object({
      menuItem: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
    })
  ).min(1).required(),
  totalAmount: Joi.number().min(0).required()
});

// POST /order - Place a new order (Protected route)
router.post('/', protect(), async (req, res) => {
  try {
    console.log('📝 Order creation attempt by:', req.user.name);
    console.log('📦 Order data:', req.body);

    // Validate request body
    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      console.warn('❌ Validation error:', error.details[0].message);
      return res.status(400).json({ 
        error: 'Validation failed',
        message: error.details[0].message 
      });
    }

    const { tableNumber, items, totalAmount } = value;

    // Verify menu items exist
    const menuItemIds = items.map(item => item.menuItem);
    const foundMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    
    if (foundMenuItems.length !== menuItemIds.length) {
      console.warn('❌ Some menu items not found');
      return res.status(400).json({ 
        error: 'Invalid menu items',
        message: 'One or more menu items do not exist' 
      });
    }

    // Create order
    const order = await Order.create({
      tableNumber,
      items,
      totalAmount,
      orderedBy: req.user._id,
      status: 'placed'
    });

    console.log('✅ Order created:', order._id);

    // Populate the created order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.menuItem', 'name price')
      .populate('orderedBy', 'name email');

    res.status(201).json({ 
      message: 'Order placed successfully', 
      order: populatedOrder 
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to place order' 
    });
  }
});

// GET /order/my - Get user's own orders
router.get('/my', protect(), async (req, res) => {
  try {
    console.log('📋 Fetching orders for user:', req.user.name);

    const orders = await Order.find({ orderedBy: req.user._id })
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders for user`);

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching user orders:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch orders' 
    });
  }
});

// GET /order/admin - Admin: Get all orders
router.get('/admin', protect('admin'), async (req, res) => {
  try {
    console.log('📋 Admin fetching all orders');

    const orders = await Order.find()
      .populate('orderedBy', 'name email')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} total orders`);

    res.json(orders);
  } catch (error) {
    console.error('❌ Admin fetch orders error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch orders' 
    });
  }
});

// PUT /order/:id/serve - Admin marks order as served
router.put('/:id/serve', protect('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: 'The specified order does not exist' 
      });
    }

    order.status = 'served';
    order.servedAt = new Date();
    await order.save();

    console.log('✅ Order marked as served:', order._id);

    const populatedOrder = await Order.findById(order._id)
      .populate('items.menuItem', 'name price')
      .populate('orderedBy', 'name email');

    res.json({ 
      message: 'Order marked as served', 
      order: populatedOrder 
    });
  } catch (error) {
    console.error('❌ Serve order error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update order status' 
    });
  }
});

router.get('/admin/analytics', protect('admin'), async (req, res) => {
  try {
    console.log('📊 Analytics request from:', req.user.name);

    const { start, end } = req.query;

    // Set date range
    const matchStage = {};
    if (start && end) {
      matchStage.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    } else {
      // Default to last 30 days
      const from = new Date();
      from.setDate(from.getDate() - 30);
      matchStage.createdAt = { $gte: from };
    }

    console.log('📅 Date range for analytics:', matchStage);

    // Daily stats aggregation
    const dailyStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalOrders: { $sum: 1 },
          dailyIncome: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly income calculation
    const monthlyIncome = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    // Top selling items
    const topItems = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        },
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
    ]);

    const result = {
      dailyStats: dailyStats || [],
      monthlyIncome: monthlyIncome[0]?.total || 0,
      topItems: topItems || [],
      summary: {
        totalOrders: dailyStats.reduce((sum, day) => sum + day.totalOrders, 0),
        averageOrderValue: monthlyIncome[0]?.total ? 
          (monthlyIncome[0].total / dailyStats.reduce((sum, day) => sum + day.totalOrders, 0)).toFixed(2) : 0
      }
    };

    console.log('✅ Analytics data prepared:', {
      dailyStats: result.dailyStats.length,
      monthlyIncome: result.monthlyIncome,
      topItems: result.topItems.length
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ Additional analytics endpoints
router.get('/admin/top-items', protect('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 15;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const topItems = await Order.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    res.json(topItems);
  } catch (error) {
    console.error('❌ Top items error:', error);
    res.status(500).json({ error: 'Failed to fetch top items' });
  }
});

// GET /order/:id/invoice - View invoice (User can see own, Admin can see all)
router.get('/:id/invoice', protect(), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.menuItem', 'name price')
      .populate('orderedBy', 'name email');

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: 'The specified order does not exist' 
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.orderedBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only view your own orders' 
      });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Invoice error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch invoice' 
    });
  }
});

module.exports = router;