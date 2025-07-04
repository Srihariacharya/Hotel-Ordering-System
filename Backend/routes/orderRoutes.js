const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Joi      = require('joi');

const Order = require('../models/Order');
const Menu  = require('../models/MenuItem');

const verifyToken = require('../middleware/verifyToken'); 

const orderSchemaJoi = Joi.object({
  tableNumber: Joi.number().integer().min(1),       
  items: Joi.array()
    .items(
      Joi.object({
        menuItem: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

router.post('/', verifyToken, async (req, res) => {
  const { error, value } = orderSchemaJoi.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { tableNumber, items } = value;
  const menuIds  = items.map((i) => i.menuItem);
  const menuDocs = await Menu.find({ _id: { $in: menuIds } });

  if (menuDocs.length !== menuIds.length) {
    return res.status(400).json({ error: 'One or more menu items not found' });
  }

  const priceMap = Object.fromEntries(menuDocs.map((d) => [d._id.toString(), d.price]));
  let total = 0;

  const itemsWithPrice = items.map((i) => {
    const lineTotal = priceMap[i.menuItem] * i.quantity;
    total += lineTotal;
    return { ...i, price: priceMap[i.menuItem] };
  });

  try {
    const order = await Order.create({
      tableNumber,
      items: itemsWithPrice,
      orderedBy: req.user.id,  
      totalAmount: total,
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  const { status, table, page = 1, limit = 10 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (table)  q.tableNumber = Number(table);

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('items.menuItem', 'name price')
    .populate('orderedBy', 'email');

  const count = await Order.countDocuments(q);

  res.json({ page: Number(page), pages: Math.ceil(count / limit), total: count, orders });
});

router.put('/:id', verifyToken, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  const allowedNext = { placed: ['preparing'], preparing: ['served'], served: [] };

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
    await order.populate([{ path: 'items.menuItem', select: 'name price' }, { path: 'orderedBy', select: 'email' }]);

    res.json(order);
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
