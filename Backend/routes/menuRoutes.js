const express = require('express');
const Joi = require('joi');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Enhanced validation schema
const menuSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().min(2).max(50).required(),
  image: Joi.string().uri().allow('').optional(),
  description: Joi.string().max(500).allow('').optional(),
  session: Joi.string().valid('morning', 'afternoon', 'evening', 'night').optional()
});

// ✅ GET all menu items (public)
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching menu items');
    const filter = req.query.category ? { category: req.query.category } : {};
    const menu = await MenuItem.find(filter).sort({ name: 1 });

    console.log(`✅ Found ${menu.length} menu items`);
    res.json(menu);
  } catch (error) {
    console.error('❌ Failed to fetch menu items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch menu items',
      message: error.message 
    });
  }
});

// ✅ FIXED: POST - Create new menu item (Admin only)
router.post('/', protect('admin'), async (req, res) => {
  try {
    console.log('➕ Creating menu item by:', req.user.name);
    console.log('📝 Menu item data:', req.body);

    // Validate request body
    const { error, value } = menuSchema.validate(req.body);
    if (error) {
      console.warn('❌ Validation error:', error.details[0].message);
      return res.status(400).json({ 
        error: 'Validation failed',
        message: error.details[0].message,
        field: error.details[0].path[0]
      });
    }

    const { name, price, category, image, description, session } = value;

    // Check if item already exists
    const existingItem = await MenuItem.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      category: { $regex: new RegExp(`^${category}$`, 'i') }
    });

    if (existingItem) {
      console.warn('⚠️ Menu item already exists:', name);
      return res.status(400).json({
        error: 'Item already exists',
        message: `A menu item with name "${name}" already exists in "${category}" category`
      });
    }

    // Create new menu item
    const newItem = await MenuItem.create({
      name: name.trim(),
      price: parseFloat(price),
      category: category.trim(),
      image: image?.trim() || '',
      description: description?.trim() || '',
      session: session || undefined
    });

    console.log('✅ Menu item created:', newItem._id);

    res.status(201).json({
      message: 'Menu item created successfully',
      item: newItem
    });

  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        error: 'Duplicate item',
        message: `A menu item with this ${field} already exists`
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create menu item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ PATCH - Update menu item (Admin only)
router.patch('/:id', protect('admin'), async (req, res) => {
  try {
    console.log('🔄 Updating menu item:', req.params.id);

    // Validate MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid item ID',
        message: 'Please provide a valid menu item ID'
      });
    }

    const updateData = { ...req.body };
    
    // Remove empty strings and undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!menuItem) {
      console.warn('⚠️ Menu item not found:', req.params.id);
      return res.status(404).json({
        error: 'Item not found',
        message: 'The specified menu item does not exist'
      });
    }

    console.log('✅ Menu item updated:', menuItem._id);

    res.json({
      message: 'Menu item updated successfully',
      item: menuItem
    });
  } catch (error) {
    console.error('❌ Update menu item failed:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update menu item' 
    });
  }
});

// ✅ DELETE - Remove menu item (Admin only)
router.delete('/:id', protect('admin'), async (req, res) => {
  try {
    console.log('🗑️ Deleting menu item:', req.params.id);

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid item ID',
        message: 'Please provide a valid menu item ID'
      });
    }

    const deleted = await MenuItem.findByIdAndDelete(req.params.id);

    if (!deleted) {
      console.warn('⚠️ Menu item not found for deletion:', req.params.id);
      return res.status(404).json({
        error: 'Item not found',
        message: 'The specified menu item does not exist'
      });
    }

    console.log('✅ Menu item deleted:', deleted.name);

    res.json({
      message: 'Menu item deleted successfully',
      deletedItem: {
        id: deleted._id,
        name: deleted.name
      }
    });
  } catch (error) {
    console.error('❌ Delete failed:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to delete menu item' 
    });
  }
});

module.exports = router;