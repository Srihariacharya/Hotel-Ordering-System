const Order = require('../models/Order');

exports.placeOrder = async (req, res) => {
  try {
    const { items, totalAmount, tableNumber } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Create order document
    const order = await Order.create({
      items,
      totalAmount,             
      tableNumber,
      orderedBy: req.user.id,  
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
};
