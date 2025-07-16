const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  session: { type: String }, // optional
  image: { type: String },   // ✅ URL to image
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
