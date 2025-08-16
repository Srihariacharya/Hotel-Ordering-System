const mongoose = require('mongoose');

const predictionDataSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  hour: { type: Number, required: true }, // 0-23
  dayOfWeek: { type: Number, required: true }, // 0-6 (Sunday=0)
  weather: {
    temperature: Number,
    condition: String, // sunny, rainy, cloudy
    humidity: Number
  },
  isHoliday: { type: Boolean, default: false },
  specialEvent: { type: String, default: null },
  actualOrders: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    quantity: Number,
    revenue: Number
  }],
  totalOrderCount: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('PredictionData', predictionDataSchema);