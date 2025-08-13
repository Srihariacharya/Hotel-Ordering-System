// controllers/orderController.js

const Order     = require('../models/Order');
const MenuItem  = require('../models/MenuItem');
const Joi       = require('joi');
const mongoose  = require('mongoose');

/* --------------------------------------------------------------
   Joi schema to validate incoming order bodies
----------------------------------------------------------------*/
const orderSchema = Joi.object({
  tableNumber: Joi.number().integer().min(1).required(),
  items: Joi.array()
    .items(
      Joi.object({
        menuItem: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
        price:    Joi.number().positive().required()   // client sends unit price
      })
    )
    .min(1)
    .required()
});

/* --------------------------------------------------------------
   POST /order  – waiter | admin creates a new order
----------------------------------------------------------------*/
// Fix the totalPrice vs totalAmount inconsistency
exports.placeOrder = async (req, res) => {
  const { error, value } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { tableNumber, items } = value;
  const ids = items.map((i) => i.menuItem);

  try {
    const docs = await MenuItem.find({ _id: { $in: ids } });
    if (docs.length !== ids.length) {
      return res.status(400).json({ error: 'One or more menu items not found' });
    }

    const priceMap = Object.fromEntries(docs.map((d) => [d._id.toString(), d.price]));
    let totalAmount = 0; // ✅ Fix: Use totalAmount consistently
    const itemsWithServerPrice = items.map((i) => {
      const unit = priceMap[i.menuItem];
      totalAmount += unit * i.quantity;
      return { ...i, price: unit };
    });

    const order = await Order.create({
      tableNumber,
      items: itemsWithServerPrice,
      totalAmount, // ✅ Fix: Use totalAmount
      orderedBy: req.user.id,
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('placeOrder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* --------------------------------------------------------------
   GET /order/my  – logged‑in user sees own orders
----------------------------------------------------------------*/
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderedBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.menuItem', 'name');

    const formatted = orders.map((o) => ({
      _id:         o._id,
      tableNumber: o.tableNumber,
      createdAt:   o.createdAt,
      status:      o.status,
      totalPrice:  o.totalPrice,
      items: o.items.map((i) => ({
        name:     i.menuItem.name,
        quantity: i.quantity,
        price:    i.price,
      })),
    }));

    res.json({ orders: formatted });
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* --------------------------------------------------------------
   GET /order  – staff list & filter orders
----------------------------------------------------------------*/
exports.listOrders = async (req, res) => {
  const { status, table, page = 1, limit = 10 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (table)  q.tableNumber = Number(table);

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const [orders, count] = await Promise.all([
      Order.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('items.menuItem', 'name')
        .populate('orderedBy', 'email'),
      Order.countDocuments(q),
    ]);

    res.json({
      page: Number(page),
      pages: Math.ceil(count / limit),
      total: count,
      orders,
    });
  } catch (err) {
    console.error('listOrders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* --------------------------------------------------------------
   PUT /order/:id  – staff advance order status
----------------------------------------------------------------*/
exports.updateOrderStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  const allowedNext = {
    placed:    ['preparing'],
    preparing: ['served'],
    served:    [],
  };

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const current = order.status;
    if (!allowedNext[current].includes(status)) {
      return res.status(400).json({
        error: `Status can only move ${current} → ${allowedNext[current].join(' / ') || 'no further change'}`,
      });
    }

    order.status = status;
    if (status === 'preparing') order.preparedAt = new Date();
    if (status === 'served')    order.servedAt   = new Date();

    await order.save();
    await order.populate('items.menuItem', 'name price');
    await order.populate('orderedBy', 'email');

    res.json(order);
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
