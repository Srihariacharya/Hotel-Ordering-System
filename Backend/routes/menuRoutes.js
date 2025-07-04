const express = require('express');
const Joi = require('joi');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');
const validateBody = require('../middleware/validateBody');

const router = express.Router();

const menuSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow(''),
  price: Joi.number().positive().required(),
  category: Joi.string().min(2).required(),
});

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.category ? { category: req.query.category } : {};
    const menu = await MenuItem.find(q).sort({ name: 1 });
    res.json(menu);
  } catch (err) { next(err); }
});

  router.post('/', protect('admin', 'waiter'),async (req, res, next) => {
    try {
      const item = await MenuItem.create(req.body);
      res.status(201).json(item);
    } catch (err) { next(err); }
  }
);

module.exports = router;

router.delete('/:id', protect(['admin']), async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ message: 'Item deleted' });
});

module.exports = router;