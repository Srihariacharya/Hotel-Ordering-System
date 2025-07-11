const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');

// ============================
// POST /order - Place an order
// ============================
router.post('/', protect(), async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const totalPrice = items.reduce((total, item) => {
      return total + item.quantity * item.price;
    }, 0);

    const order = await Order.create({
      items,
      tableNumber,
      totalPrice,
      orderedBy: req.user._id, // ✅ save user ID in "orderedBy"
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('❌ Error placing order:', err.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ======================================
// GET /order/my - Get current user's orders
// ======================================
router.get('/my', protect(), async (req, res) => {
  try {
    const orders = await Order.find({ orderedBy: req.user._id })
      .populate('items.menuItem', 'name') // ✅ get item name
      .sort({ createdAt: -1 });           // latest orders first

    res.json(orders);
  } catch (err) {
    console.error('❌ Error fetching user orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
