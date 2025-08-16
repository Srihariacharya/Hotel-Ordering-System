// Backend/jobs/predictionCron.js
const cron = require('node-cron');
const predictionService = require('../services/predictionService');
const Order = require('../models/Order');

class PredictionCron {
  constructor() {
    this.startJobs();
  }

  startJobs() {
    // Generate predictions every hour for the next 6 hours
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running hourly prediction generation...');
      await this.generateHourlyPredictions();
    });

    // Train model with fresh data every night at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧠 Running nightly model training...');
      await this.trainModelWithLatestData();
    });

    // Update prediction accuracy every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      console.log('📊 Updating prediction accuracy...');
      await this.updateAccuracyMetrics();
    });

    console.log('✅ Prediction cron jobs started');
  }

  async generateHourlyPredictions() {
    try {
      const now = new Date();
      const predictions = [];

      // Generate predictions for next 6 hours
      for (let i = 1; i <= 6; i++) {
        const futureDate = new Date(now.getTime() + i * 60 * 60 * 1000);
        const dateString = futureDate.toISOString().split('T')[0];
        const hour = futureDate.getHours();

        try {
          const prediction = await predictionService.generatePredictions(dateString, hour);
          predictions.push(prediction);
        } catch (error) {
          console.warn(`⚠️ Failed to generate prediction for ${dateString} ${hour}:00:`, error.message);
        }
      }

      console.log(`✅ Generated ${predictions.length} hourly predictions`);
    } catch (error) {
      console.error('❌ Hourly prediction generation failed:', error);
    }
  }

  async trainModelWithLatestData() {
    try {
      const dataPoints = await predictionService.collectHistoricalData();
      console.log(`✅ Model trained with ${dataPoints} data points`);
    } catch (error) {
      console.error('❌ Nightly training failed:', error);
    }
  }

  async updateAccuracyMetrics() {
    try {
      // Find predictions from 1-2 hours ago to compare with actual results
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const predictions = await predictionService.Prediction.find({
        predictionFor: { $gte: twoHoursAgo, $lte: oneHourAgo },
        accuracy: { $exists: false }
      });

      for (const prediction of predictions) {
        // Get actual orders for that time period
        const actualOrders = await Order.find({
          createdAt: {
            $gte: prediction.predictionFor,
            $lt: new Date(prediction.predictionFor.getTime() + 60 * 60 * 1000)
          }
        });

        // Group actual orders by menu item
        const actualData = {};
        for (const order of actualOrders) {
          for (const item of order.items) {
            const menuId = item.menuItem.toString();
            actualData[menuId] = (actualData[menuId] || 0) + item.quantity;
          }
        }

        // Convert to array format expected by updatePredictionAccuracy
        const actualOrdersArray = Object.keys(actualData).map(menuId => ({
          menuItem: menuId,
          quantity: actualData[menuId]
        }));

        await predictionService.updatePredictionAccuracy(prediction._id, actualOrdersArray);
      }

      console.log(`✅ Updated accuracy for ${predictions.length} predictions`);
    } catch (error) {
      console.error('❌ Accuracy update failed:', error);
    }
  }
}

module.exports = new PredictionCron();