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

 router.post('/', protect('admin'), async (req, res) => {
  const { name, category, price, session, image } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const item = await MenuItem.create({
    name,
    category,
    price,
    session,
    image, // ✅ saved to DB
  });

  res.status(201).json(item);
});

// PATCH /menu/:id – Update image URL
router.patch('/:id', protect('admin'), async (req, res) => {
  try {
    const { image } = req.body;
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { image },
      { new: true }
    );
    res.json(menuItem);
  } catch (err) {
    console.error('❌ Update menu item failed:', err.message);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});


module.exports = router;

router.delete('/:id', protect(['admin']), async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ message: 'Item deleted' });
});

module.exports = router;