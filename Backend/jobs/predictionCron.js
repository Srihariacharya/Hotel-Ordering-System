// Backend/jobs/predictionCron.js
const cron = require('node-cron');
const predictionService = require('../services/predictionService');
const Order = require('../models/Order');
const Prediction = require('../models/Prediction'); // ✅ require at top to fix "find is not a function" error

class PredictionCron {
  constructor() {
    this.isTraining = false;
    this.isGenerating = false;
    this.startJobs();
  }

  startJobs() {
    // 🔹 Generate predictions every hour
    cron.schedule('0 * * * *', async () => {
      if (this.isGenerating) return console.log('⏸️ Skipping hourly generation (already running)');
      console.log('⏰ Running hourly prediction generation...');
      await this.generateHourlyPredictions();
    });

    // 🔹 Train model nightly at 2 AM
    cron.schedule('0 2 * * *', async () => {
      if (this.isTraining) return console.log('⏸️ Skipping nightly training (already running)');
      console.log('🧠 Running nightly model training...');
      await this.trainModelWithLatestData();
    });

    // 🔹 Update prediction accuracy every 30 mins
    cron.schedule('*/30 * * * *', async () => {
      console.log('📊 Updating prediction accuracy...');
      await this.updateAccuracyMetrics();
    });

    console.log('✅ Prediction cron jobs started');
  }

  async generateHourlyPredictions() {
    if (this.isGenerating) return;
    this.isGenerating = true;

    try {
      const now = new Date();
      const predictions = [];
      const errors = [];

      for (let i = 1; i <= 6; i++) {
        try {
          const futureDate = new Date(now.getTime() + i * 60 * 60 * 1000);
          const dateString = futureDate.toISOString().split('T')[0];
          const hour = futureDate.getHours();

          const prediction = await predictionService.generatePredictions(dateString, hour);
          predictions.push(prediction);

          console.log(`✅ Generated prediction for ${dateString} ${hour}:00 - ${prediction.totalPredictedOrders} orders`);

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          const futureDate = new Date(now.getTime() + i * 60 * 60 * 1000);
          const dateString = futureDate.toISOString().split('T')[0];
          const hour = futureDate.getHours();

          console.warn(`⚠️ Failed to generate prediction for ${dateString} ${hour}:00:`, error.message);
          errors.push({ date: dateString, hour, error: error.message });
        }
      }

      console.log(`✅ Generated ${predictions.length} predictions (${errors.length} errors)`);
      if (errors.length) console.log('❌ Prediction errors:', errors);
    } catch (error) {
      console.error('❌ Hourly prediction generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  async trainModelWithLatestData() {
    if (this.isTraining) return;
    this.isTraining = true;

    try {
      console.log('🧠 Starting model training...');
      const dataPoints = await predictionService.collectHistoricalData();

      if (dataPoints > 0) {
        console.log(`✅ Model trained successfully with ${dataPoints} data points`);
        // Generate fresh predictions after training
        setTimeout(() => this.generateHourlyPredictions(), 5000);
      } else {
        console.warn('⚠️ No training data available - skipping training');
      }
    } catch (error) {
      console.error('❌ Nightly training failed:', error);
    } finally {
      this.isTraining = false;
    }
  }

  async updateAccuracyMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const predictions = await Prediction.find({
        predictionFor: { $gte: twoHoursAgo, $lte: oneHourAgo },
        accuracy: { $exists: false }
      });

      let updatedCount = 0;

      for (const prediction of predictions) {
        try {
          const startTime = new Date(prediction.predictionFor);
          startTime.setHours(prediction.hour, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(prediction.hour + 1, 0, 0, 0);

          const actualOrders = await Order.find({
            createdAt: { $gte: startTime, $lt: endTime }
          }).populate('items.menuItem');

          const actualData = {};
          for (const order of actualOrders) {
            for (const item of order.items) {
              if (!item.menuItem || !item.menuItem._id) continue;
              const menuId = item.menuItem._id.toString();
              actualData[menuId] = (actualData[menuId] || 0) + item.quantity;
            }
          }

          const actualOrdersArray = Object.keys(actualData).map(menuId => ({
            menuItem: menuId,
            quantity: actualData[menuId]
          }));

          await predictionService.updatePredictionAccuracy(prediction._id, actualOrdersArray);
          updatedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to update accuracy for prediction ${prediction._id}:`, error.message);
        }
      }

      console.log(`✅ Updated accuracy for ${updatedCount}/${predictions.length} predictions`);
    } catch (error) {
      console.error('❌ Accuracy update failed:', error);
    }
  }

  // Manual test methods
  async generateTestPredictions() {
    console.log('🧪 Generating test predictions...');
    return await this.generateHourlyPredictions();
  }

  async trainTestModel() {
    console.log('🧪 Training test model...');
    return await this.trainModelWithLatestData();
  }

  getStatus() {
    return {
      isTraining: this.isTraining,
      isGenerating: this.isGenerating,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new PredictionCron();
