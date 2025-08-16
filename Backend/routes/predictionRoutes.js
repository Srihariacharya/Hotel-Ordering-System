const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const predictionService = require('../services/predictionService');
const Prediction = require('../models/Prediction');

// GET /predictions/train - Train the model with historical data
router.post('/train', protect('admin'), async (req, res) => {
  try {
    console.log('🧠 Training prediction model...');
    const dataPoints = await predictionService.collectHistoricalData();
    
    res.json({
      message: 'Model training completed',
      dataPoints,
      status: 'success'
    });
  } catch (error) {
    console.error('❌ Training error:', error);
    res.status(500).json({
      error: 'Training failed',
      message: error.message
    });
  }
});

// POST /predictions/generate - Generate predictions for specific date/hour
router.post('/generate', protect('admin'), async (req, res) => {
  try {
    const { date, hour } = req.body;
    
    if (!date || hour === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Date and hour are required'
      });
    }

    const prediction = await predictionService.generatePredictions(date, hour);
    await prediction.populate('predictions.menuItem', 'name category price');
    
    res.json({
      message: 'Predictions generated successfully',
      prediction
    });
  } catch (error) {
    console.error('❌ Prediction generation error:', error);
    res.status(500).json({
      error: 'Prediction generation failed',
      message: error.message
    });
  }
});

// GET /predictions/current - Get predictions for next few hours
router.get('/current', protect('admin'), async (req, res) => {
  try {
    const now = new Date();
    const nextHours = [];
    
    // Get predictions for next 6 hours
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now.getTime() + i * 60 * 60 * 1000);
      nextHours.push({
        date: futureDate.toISOString().split('T')[0],
        hour: futureDate.getHours()
      });
    }

    const predictions = await Prediction.find({
      $or: nextHours.map(nh => ({
        predictionFor: {
          $gte: new Date(nh.date + 'T' + nh.hour.toString().padStart(2, '0') + ':00:00.000Z'),
          $lt: new Date(nh.date + 'T' + (nh.hour + 1).toString().padStart(2, '0') + ':00:00.000Z')
        }
      }))
    }).populate('predictions.menuItem', 'name category price imageUrl');

    res.json({
      predictions,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Error fetching current predictions:', error);
    res.status(500).json({
      error: 'Failed to fetch predictions',
      message: error.message
    });
  }
});

// GET /predictions/accuracy - Get prediction accuracy metrics
router.get('/accuracy', protect('admin'), async (req, res) => {
  try {
    const predictions = await Prediction.find({
      accuracy: { $exists: true }
    }).sort({ createdAt: -1 }).limit(50);

    const avgAccuracy = predictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / predictions.length;
    
    const accuracyByHour = {};
    predictions.forEach(p => {
      if (!accuracyByHour[p.hour]) {
        accuracyByHour[p.hour] = { total: 0, count: 0 };
      }
      accuracyByHour[p.hour].total += p.accuracy || 0;
      accuracyByHour[p.hour].count += 1;
    });

    const hourlyAccuracy = Object.keys(accuracyByHour).map(hour => ({
      hour: parseInt(hour),
      accuracy: accuracyByHour[hour].total / accuracyByHour[hour].count
    }));

    res.json({
      overallAccuracy: avgAccuracy,
      predictionCount: predictions.length,
      hourlyAccuracy,
      recentPredictions: predictions.slice(0, 10).map(p => ({
        date: p.predictionFor,
        hour: p.hour,
        accuracy: p.accuracy,
        totalPredicted: p.totalPredictedOrders
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching accuracy metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch accuracy metrics',
      message: error.message
    });
  }
});

module.exports = router;