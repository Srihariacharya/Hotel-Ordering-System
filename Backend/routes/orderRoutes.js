// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');

// ==============================================
// ✅ POST /order – Place a new order (User/Waiter)
// ==============================================
router.post('/', protect(), async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

     const totalAmount = items.reduce((total, item) => {
      return total + item.quantity * item.price;
    }, 0);

    const order = await Order.create({
      items,
      tableNumber,
      totalAmount,               // ✅ Correct field name
      orderedBy: req.user._id,
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('❌ Error placing order:', err.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ===================================================
// ✅ GET /order/my – Get current user's own orders
// ===================================================
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

// ===================================================
// ✅ GET /order/admin – Admin: Get all placed orders
// ===================================================
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

// ==========================================================
// ✅ PUT /order/:id/serve – Admin: Mark an order as served
// ==========================================================
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

// ===========================================================
// ✅ GET /order/:id/invoice – View invoice after serving
// ===========================================================
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

module.exports = router;
