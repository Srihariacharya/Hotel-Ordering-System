const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  category: String,
  image: { type: String, default: '/placeholder.png' }, // Add this
});

module.exports = mongoose.model('MenuItem', menuItemSchema);