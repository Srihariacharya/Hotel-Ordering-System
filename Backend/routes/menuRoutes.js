const express = require('express');
const Joi = require('joi');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');
const validateBody = require('../middleware/validateBody');

const router = express.Router();

// ✅ Validation schema using Joi
const menuSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow(''),
  price: Joi.number().positive().required(),
  category: Joi.string().min(2).required(),
  session: Joi.string().valid('morning', 'afternoon', 'evening', 'night').optional(),
  image: Joi.string().uri().required()
});

// 📦 GET all menu items (optional filter by category)
router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const menu = await MenuItem.find(filter).sort({ name: 1 });
    res.json(menu);
  } catch (err) {
    next(err);
  }
});

// ➕ POST: Create new menu item (with validation)
router.post('/', protect('admin'), validateBody(menuSchema), async (req, res) => {
  try {
    const newItem = await MenuItem.create(req.body);
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error adding menu item:', err.message);
    res.status(500).json({ message: 'Failed to add item' });
  }
});

// 🔄 PATCH: Update image or partial fields
router.patch('/:id', protect('admin'), async (req, res) => {
  try {
    const updateData = req.body;
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!menuItem) return res.status(404).json({ message: 'Item not found' });
    res.json(menuItem);
  } catch (err) {
    console.error('❌ Update menu item failed:', err.message);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// ❌ DELETE: Remove menu item
router.delete('/:id', protect('admin'), async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('❌ Delete failed:', err.message);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;
