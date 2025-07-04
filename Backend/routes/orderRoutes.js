const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();
const mongoose = require('mongoose'); 
const Joi = require('joi');
const Menu = require('../models/MenuItem');


const orderSchemaJoi = Joi.object({
  tableNumber: Joi.number().integer().min(1).required(),
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

  router.post('/', protect('admin', 'waiter'),async (req, res) => {
  const { error, value } = orderSchemaJoi.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { tableNumber, items } = value;

  const menuIds = items.map(i => i.menuItem);
  const menuDocs = await Menu.find({ _id: { $in: menuIds } });

  if (menuDocs.length !== menuIds.length) {
    return res.status(400).json({ error: 'One or more menu items not found' });
  }

  const priceMap = Object.fromEntries(menuDocs.map(d => [d._id.toString(), d.price]));

  let total = 0;
  const itemsWithPrice = items.map(i => {
    const lineTotal = priceMap[i.menuItem] * i.quantity;
    total += lineTotal;
    return { ...i, linePrice: lineTotal };
  });

  const order = await Order.create({
    tableNumber,
    items: itemsWithPrice,
    orderedBy: req.user.userId,
    orderedBy: req.user._id,  
    totalPrice: total,
  });

  res.status(201).json(order);
});

router.get('/', protect('admin', 'waiter'), async (req, res) => {
  const { status, table, page = 1, limit = 10 } = req.query;

  const q = {};
  if (status) q.status = status;                    
  if (table)  q.tableNumber = Number(table);      

  if (req.user.role === 'waiter') q.orderedBy = req.user.userId;

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('items.menuItem', 'name price')
    .populate('orderedBy', 'email');

  const count = await Order.countDocuments(q);

  res.json({
    page: Number(page),
    pages: Math.ceil(count / limit),
    total: count,
    orders,
  });
});


module.exports = router;

router.put('/:id', protect('admin', 'waiter'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  const allowedNext = {
    placed: ['preparing'],
    preparing: ['served'],
    served: [] // terminal
  };

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

 const current = order.status;
    if (!allowedNext[current].includes(status)) {
      return res.status(400).json({
        error: `Status can only move ${current} → ${allowedNext[current].join(' / ') || 'no further change'}`
      });
    }

    order.status = status;
    if (status === 'preparing') order.preparedAt = new Date();
    if (status === 'served')    order.servedAt   = new Date();

    await order.save();

    await order.populate([
      { path: 'items.menuItem', select: 'name price' },
      { path: 'orderedBy',      select: 'email'      }
    ]);

    res.json(order); 
  } catch (err) {
    console.error('Update failed:', err.message);  
    res.status(500).json({ error: err.message });   

  }
});
