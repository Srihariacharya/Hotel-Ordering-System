const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');

// =====================================
// ✅ Schema validation using Joi
// =====================================
const orderSchema = Joi.object({
  tableNumber: Joi.number().integer().min(1).required(),
  items: Joi.array().items(
    Joi.object({
      menuItem: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
    })
  ).min(1).required(),
  totalAmount: Joi.number().min(1).required()
});

// =====================================
// ✅ POST /order – Place a new order
// =====================================
router.post('/', protect(), async (req, res) => {
  try {
    const { error } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { tableNumber, items, totalAmount } = req.body;

    const order = await Order.create({
      tableNumber,
      items,
      totalAmount,
      orderedBy: req.user._id,
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('❌ Error placing order:', err.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ==========================================
// ✅ GET /order/my – Get user's own orders
// ==========================================
router.get('/my', protect(), async (req, res) => {
  try {
    const orders = await Order.find({ orderedBy: req.user._id })
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('❌ Error fetching user orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============================================
// ✅ GET /order/admin – Admin: All placed orders
// ============================================
router.get('/admin', protect('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('orderedBy', 'name email')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('❌ Admin fetch orders error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================================
// ✅ PUT /order/:id/serve – Admin marks order served
// ===================================================
router.put('/:id/serve', protect('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'served';
    order.servedAt = new Date();
    await order.save();

    res.json({ message: 'Order marked as served', order });
  } catch (err) {
    console.error('❌ Serve order error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// ✅ GET /order/:id/invoice – View invoice after serving
// ======================================================
router.get('/:id/invoice', protect(), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.menuItem', 'name price')
      .populate('orderedBy', 'name email');

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.orderedBy._id.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status !== 'served') {
      return res.status(400).json({ error: 'Invoice available only after serving' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Invoice error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// ✅ GET /order/admin/analytics?start=&end=
// Analytics per day + monthly + top-selling items
// ======================================================
router.get('/admin/analytics', protect('admin'), async (req, res) => {
  try {
    const { start, end } = req.query;

    const matchStage = {};
    if (start && end) {
      matchStage.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    } else {
      // Default to last 15 days
      const from = new Date();
      from.setDate(from.getDate() - 15);
      matchStage.createdAt = { $gte: from };
    }

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

    const monthlyIncome = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    const topItems = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          quantitySold: { $sum: '$items.quantity' },
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
      { $unwind: '$menuItem' },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      dailyStats,
      monthlyIncome: monthlyIncome[0]?.total || 0,
      topItems,
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==================================================
// ✅ GET /order/admin/top-items?days=15
// Top selling items by quantity + revenue
// ==================================================
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
      { $unwind: '$menuItem' },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    res.json(topItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top-selling items' });
  }
});

module.exports = router;
