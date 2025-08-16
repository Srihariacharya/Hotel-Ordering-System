// Backend/models/Prediction.js
const mongoose = require('mongoose');

// Schema for individual menu item prediction
const predictionItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  predictedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  factors: [
    {
      factor: { type: String },
      impact: { type: Number, min: 0, max: 1 }
    }
  ]
}, { _id: false });

// Main prediction schema
const predictionSchema = new mongoose.Schema({
  predictionFor: {
    type: Date,
    required: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  predictions: [predictionItemSchema],
  totalPredictedOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPredictedRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  }
}, {
  timestamps: true // automatically adds createdAt and updatedAt
});

// Indexes for faster queries
predictionSchema.index({ predictionFor: 1, hour: 1 });
predictionSchema.index({ 'predictions.menuItem': 1 });

// Pre-save hook to ensure totalPredictedOrders and totalPredictedRevenue are consistent
predictionSchema.pre('save', function(next) {
  if (this.predictions && this.predictions.length > 0) {
    this.totalPredictedOrders = this.predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
    this.totalPredictedRevenue = this.predictions.reduce((sum, p) => {
      if (!p.menuItem || !p.predictedQuantity) return sum;
      return sum + (p.menuItem.price ? p.menuItem.price * p.predictedQuantity : 0);
    }, 0);
  }
  next();
});

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;
