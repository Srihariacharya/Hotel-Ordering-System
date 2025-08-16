const predictionSchema = new mongoose.Schema({
  predictionFor: { type: Date, required: true },
  hour: { type: Number, required: true },
  predictions: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    predictedQuantity: Number,
    confidence: Number, // 0-1
    factors: [{
      factor: String,
      impact: Number
    }]
  }],
  totalPredictedOrders: Number,
  totalPredictedRevenue: Number,
  accuracy: Number, // Updated after actual results
  weatherData: {
    temperature: Number,
    condition: String,
    humidity: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);