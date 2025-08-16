// Backend/models/Prediction.js - UPDATED VERSION
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
    default: 0.5
  },
  factors: [
    {
      factor: { type: String },
      impact: { type: Number, min: 0, max: 5 }
    }
  ]
}, { _id: false });

// Weather data schema
const weatherDataSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    min: -50,
    max: 60
  },
  condition: {
    type: String,
    enum: ['sunny', 'rainy', 'cloudy', 'stormy'],
    default: 'sunny'
  },
  humidity: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  }
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
  weatherData: {
    type: weatherDataSchema,
    default: () => ({
      temperature: 25,
      condition: 'sunny',
      humidity: 60
    })
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  isHoliday: {
    type: Boolean,
    default: false
  },
  specialEvent: {
    type: String,
    default: null
  }
}, {
  timestamps: true // automatically adds createdAt and updatedAt
});

// Indexes for faster queries - Handle conflicts gracefully
predictionSchema.index({ predictionFor: 1, hour: 1 }, { 
  unique: true, 
  name: 'prediction_datetime_unique' // Custom name to avoid conflicts
});
predictionSchema.index({ 'predictions.menuItem': 1 });
predictionSchema.index({ createdAt: -1 });

// Pre-save hook to ensure totalPredictedOrders and totalPredictedRevenue are consistent
predictionSchema.pre('save', async function(next) {
  if (this.predictions && this.predictions.length > 0) {
    this.totalPredictedOrders = this.predictions.reduce((sum, p) => sum + (p.predictedQuantity || 0), 0);
    
    // Calculate revenue - need to populate menuItem prices if not already done
    if (this.isModified('predictions') || this.isNew) {
      let totalRevenue = 0;
      
      // If predictions have populated menuItems, calculate directly
      for (const prediction of this.predictions) {
        if (prediction.menuItem && typeof prediction.menuItem === 'object' && prediction.menuItem.price) {
          totalRevenue += prediction.menuItem.price * prediction.predictedQuantity;
        } else if (prediction.menuItem) {
          // If only ID is present, we'll need to fetch the price
          try {
            const MenuItem = mongoose.model('MenuItem');
            const menuItem = await MenuItem.findById(prediction.menuItem).select('price');
            if (menuItem && menuItem.price) {
              totalRevenue += menuItem.price * prediction.predictedQuantity;
            }
          } catch (error) {
            console.warn('Could not fetch menu item price for revenue calculation');
          }
        }
      }
      
      this.totalPredictedRevenue = Math.round(totalRevenue);
    }
  } else {
    this.totalPredictedOrders = 0;
    this.totalPredictedRevenue = 0;
  }
  
  next();
});

// Instance method to get formatted prediction summary
predictionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    dateTime: this.predictionFor,
    hour: this.hour,
    totalOrders: this.totalPredictedOrders,
    totalRevenue: this.totalPredictedRevenue,
    itemCount: this.predictions.length,
    avgConfidence: this.predictions.length > 0 
      ? this.predictions.reduce((sum, p) => sum + p.confidence, 0) / this.predictions.length 
      : 0,
    weather: this.weatherData,
    accuracy: this.accuracy
  };
};

// Static method to get predictions for a date range
predictionSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    predictionFor: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('predictions.menuItem', 'name price category imageUrl');
};

// Static method to get current hour prediction
predictionSchema.statics.getCurrentPrediction = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentHour = now.getHours();
  
  return this.findOne({
    predictionFor: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    },
    hour: currentHour
  }).populate('predictions.menuItem', 'name price category imageUrl');
};

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;