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
    tableNumber: Number,
    totalAmount: { type: Number, required: true },
    orderedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['placed', 'preparing', 'served'], default: 'placed' },
    preparedAt:  Date,
    servedAt:    Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
