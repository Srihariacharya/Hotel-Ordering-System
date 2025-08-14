const express = require('express');
const Joi = require('joi');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');
const validateBody = require('../middleware/validateBody');

const router = express.Router();

// ✅ Validation schema - accepts 'image' from frontend
const menuSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow('').optional(),
  price: Joi.number().positive().required(),
  category: Joi.string().min(2).required(),
  session: Joi.string().valid('morning', 'afternoon', 'evening', 'night').optional(),
  image: Joi.string().uri().optional()
});

// 📦 GET all menu items
router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const menu = await MenuItem.find(filter).sort({ name: 1 });

    if (!menu || menu.length === 0) {
      return res.status(404).json({ message: 'No menu items found' });
    }

    res.status(200).json(menu);
  } catch (err) {
    console.error('❌ Failed to fetch menu items:', err.message);
    next(err);
  }
});

// ➕ POST: Create new menu item (Admin only) - REPLACE YOUR CURRENT POST ROUTE WITH THIS
router.post('/', protect('admin'), validateBody(menuSchema), async (req, res) => {
  try {
    console.log('📥 POST /menu - Received data:', req.body);
    console.log('👤 User:', req.user?.name);

    // ✅ CRITICAL FIX: Convert 'image' field to 'imageUrl' for database
    const menuItemData = {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      // This line converts frontend 'image' to database 'imageUrl'
      imageUrl: req.body.image || req.body.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'
    };

    console.log('🔄 Converted data for database:', menuItemData);

    // Create the menu item using the converted data
    const newItem = await MenuItem.create(menuItemData);
    
    console.log('✅ Menu item created successfully:', newItem._id);
    res.status(201).json(newItem);
    
  } catch (err) {
    console.error('❌ Error adding menu item:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: 'Database validation failed',
        message: `Validation failed: ${errors.join(', ')}`,
        details: err.message
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create menu item',
      details: err.message
    });
  }
});

// 🔄 PATCH: Update menu item
router.patch('/:id', protect('admin'), async (req, res) => {
  try {
    console.log('📝 Updating menu item:', req.params.id, 'with data:', req.body);

    const updateData = { ...req.body };
    if (updateData.image && !updateData.imageUrl) {
      updateData.imageUrl = updateData.image;
      delete updateData.image;
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json(menuItem);
  } catch (err) {
    console.error('❌ Update failed:', err);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// ❌ DELETE: Remove menu item
router.delete('/:id', protect('admin'), async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Delete failed:', err.message);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;