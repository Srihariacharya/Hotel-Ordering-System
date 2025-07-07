const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        price:    { type: Number, required: true },
      },
    ],
    tableNumber: { type: Number, required: true },
    totalPrice:  { type: Number, required: true },   // ✓ renamed
    orderedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['placed', 'preparing', 'served'], default: 'placed' },
    preparedAt:  Date,
    servedAt:    Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
