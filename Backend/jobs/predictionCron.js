// Backend/jobs/predictionCron.js - FULLY UPDATED & FIXED VERSION
const cron = require("node-cron");
const predictionService = require("../services/predictionService");
const Order = require("../models/Order");
const Prediction = require("../models/Prediction");

class PredictionCron {
  constructor() {
    this.isTraining = false;
    this.isGenerating = false;
    this.isUpdatingAccuracy = false;
    this.jobsStarted = false;
    this.stats = {
      predictionsGenerated: 0,
      accuracyUpdates: 0,
      trainingRuns: 0,
      lastError: null,
      lastRun: null,
    };
  }

  startJobs() {
    if (this.jobsStarted) {
      console.log("⚠️ Cron jobs already started");
      return;
    }

    console.log("🚀 Starting prediction cron jobs...");

    // 🔹 Generate predictions every hour at minute 5
    cron.schedule(
      "5 * * * *",
      async () => {
        if (this.isGenerating) {
          console.log("⏸️ Skipping hourly generation (already running)");
          return;
        }
        console.log("⏰ Running hourly prediction generation...");
        await this.generateHourlyPredictions();
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    // 🔹 Train model nightly at 2:30 AM
    cron.schedule(
      "30 2 * * *",
      async () => {
        if (this.isTraining) {
          console.log("⏸️ Skipping nightly training (already running)");
          return;
        }
        console.log("🧠 Running nightly model training...");
        await this.trainModelWithLatestData();
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    // 🔹 Update prediction accuracy every 30 minutes
    cron.schedule(
      "*/30 * * * *",
      async () => {
        if (this.isUpdatingAccuracy) {
          console.log("⏸️ Skipping accuracy update (already running)");
          return;
        }
        console.log("📊 Updating prediction accuracy...");
        await this.updateAccuracyMetrics();
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    // 🔹 Cleanup old predictions weekly (Sunday at 3:00 AM)
    cron.schedule(
      "0 3 * * 0",
      async () => {
        console.log("🧹 Running weekly cleanup...");
        await this.cleanupOldPredictions();
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    // 🔹 System health check every 6 hours
    cron.schedule(
      "0 */6 * * *",
      async () => {
        console.log("🔍 Running system health check...");
        await this.performHealthCheck();
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    this.jobsStarted = true;
    console.log("✅ All prediction cron jobs started successfully");
  }

  async generateHourlyPredictions() {
    if (this.isGenerating) return;
    this.isGenerating = true;

    const startTime = Date.now();
    const predictions = [];
    const errors = [];

    try {
      const now = new Date();

      // Generate predictions for next 6 hours
      for (let i = 1; i <= 6; i++) {
        try {
          const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
          const futureDate = new Date(
            futureTime.getFullYear(),
            futureTime.getMonth(),
            futureTime.getDate()
          );
          const hour = futureTime.getHours();

          const existingPrediction = await Prediction.findOne({
            predictionFor: {
              $gte: futureDate,
              $lt: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000),
            },
            hour,
          });

          if (existingPrediction) continue;

          const prediction = await predictionService.generatePredictions(
            futureDate,
            hour
          );

          if (prediction) {
            predictions.push(prediction);
            this.stats.predictionsGenerated++;
          }

          await this.sleep(500);
        } catch (err) {
          errors.push({
            error: err.message,
            timestamp: new Date(),
          });
        }
      }

      this.stats.lastRun = new Date();
    } catch (error) {
      this.stats.lastError = {
        error: error.message,
        context: "hourly_prediction_generation",
      };
    } finally {
      this.isGenerating = false;
    }
  }

  async trainModelWithLatestData() {
    if (this.isTraining) return;
    this.isTraining = true;

    try {
      const lastTraining = await this.getLastTrainingTime();
      const newOrdersCount = await this.getNewOrdersCount(lastTraining);

      if (newOrdersCount === 0) {
        console.log("ℹ️ No new orders since last training - skipping");
        return;
      }

      const dataPoints = await predictionService.collectHistoricalData();

      if (dataPoints > 0) {
        this.stats.trainingRuns++;
        await this.updateLastTrainingTime();
        setTimeout(() => this.generateHourlyPredictions(), 5000);
      }
    } catch (error) {
      this.stats.lastError = {
        error: error.message,
        context: "model_training",
      };
    } finally {
      this.isTraining = false;
    }
  }

  async updateAccuracyMetrics() {
    if (this.isUpdatingAccuracy) return;
    this.isUpdatingAccuracy = true;

    try {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const predictions = await Prediction.find({
        predictionFor: { $gte: threeHoursAgo, $lte: oneHourAgo },
        accuracy: { $exists: false },
      }).limit(10);

      for (const prediction of predictions) {
        try {
          const startTime = new Date(prediction.predictionFor);
          startTime.setHours(prediction.hour, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(prediction.hour + 1, 0, 0, 0);

          const actualOrders = await Order.find({
            createdAt: { $gte: startTime, $lt: endTime },
            status: { $in: ["delivered", "served", "completed"] },
          }).populate("items.menuItem", "name price");

          const actualData = {};
          for (const order of actualOrders) {
            for (const item of order.items || []) {
              if (item.menuItem && item.menuItem._id) {
                const id = item.menuItem._id.toString();
                actualData[id] = (actualData[id] || 0) + (item.quantity || 0);
              }
            }
          }

          const actualOrdersArray = Object.keys(actualData).map((menuId) => ({
            menuItem: menuId,
            quantity: actualData[menuId],
          }));

          const updated = await predictionService.updatePredictionAccuracy(
            prediction._id,
            actualOrdersArray
          );

          if (updated !== undefined) {
            this.stats.accuracyUpdates++;
          }

          await this.sleep(300);
        } catch (err) {
          this.stats.lastError = {
            error: err.message,
            context: "accuracy_update",
          };
        }
      }
    } catch (error) {
      this.stats.lastError = {
        error: error.message,
        context: "accuracy_update",
      };
    } finally {
      this.isUpdatingAccuracy = false;
    }
  }

  async cleanupOldPredictions() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await Prediction.deleteMany({ predictionFor: { $lt: cutoff } });
    } catch (error) {
      this.stats.lastError = {
        error: error.message,
        context: "cleanup",
      };
    }
  }

  async performHealthCheck() {
    try {
      const now = new Date();
      const sixHoursAhead = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      const futurePredictions = await Prediction.find({
        predictionFor: { $gte: now, $lte: sixHoursAhead },
      });

      if (futurePredictions.length < 3) {
        await this.generateHourlyPredictions();
      }
    } catch (error) {
      this.stats.lastError = {
        error: error.message,
        context: "health_check",
      };
    }
  }

  async getLastTrainingTime() {
    const meta = await Prediction.findOne({ type: "training_meta" });
    return meta?.lastTraining || new Date(0);
  }

  async getNewOrdersCount(sinceTime) {
    return await Order.countDocuments({ createdAt: { $gt: sinceTime } });
  }

  async updateLastTrainingTime() {
    await Prediction.updateOne(
      { type: "training_meta" },
      { $set: { lastTraining: new Date() } },
      { upsert: true }
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return this.stats;
  }
}

module.exports = new PredictionCron();
