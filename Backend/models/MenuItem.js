const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Item name is required'],
    trim: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    trim: true
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  imageUrl: { 
    type: String, 
    required: false, // ✅ Make it optional to avoid validation errors
    default: 'https://via.placeholder.com/300x200?text=No+Image'
  },
}, {
  timestamps: true // Add createdAt and updatedAt
});

module.exports = mongoose.model('MenuItem', menuItemSchema);