// Backend/routes/predictionRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const PredictionService = require("../services/predictionService");
const PredictionData = require("../models/PredictionData");
const Prediction = require("../models/Prediction");
const MenuItem = require("../models/MenuItem");

console.log("🔧 Loading prediction routes...");

// -----------------------------
// Root Route (API Info)
// -----------------------------
router.get("/", (req, res) => {
  res.json({
    message: "Prediction API Routes",
    routes: [
      "GET /predictions/test",
      "GET /predictions/current",
      "POST /predictions/train",
      "POST /predictions/generate",
      "GET /predictions/accuracy",
      "GET /predictions/all"
    ],
    status: "All routes available",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// Test Route
// -----------------------------
router.get("/test", (req, res) => {
  console.log("✅ GET /predictions/test called");
  res.json({
    message: "Prediction routes are working!",
    timestamp: new Date().toISOString(),
    route: "test",
  });
});

// -----------------------------
// Current Predictions
// -----------------------------
router.get("/current", async (req, res) => {
  try {
    console.log("📊 Fetching current predictions...");
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let prediction = await Prediction.findOne({
      predictionFor: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      hour: currentHour
    }).populate("predictions.menuItem", "name price category imageUrl");

    if (!prediction) {
      console.log("⚡ No existing prediction, generating new one...");
      prediction = await PredictionService.generatePredictions(today, currentHour);
      prediction = await prediction.populate("predictions.menuItem", "name price category imageUrl");
    }

    if (!prediction?.predictions?.length) {
      return res.json({
        predictionFor: today,
        hour: currentHour,
        predictions: [],
        totalPredictedOrders: 0,
        totalPredictedRevenue: 0,
        weatherData: await PredictionService.getWeatherData(today),
        message: "No predictions available - add menu items and train the model"
      });
    }

    res.json({
      _id: prediction._id,
      predictionFor: prediction.predictionFor,
      hour: prediction.hour,
      predictions: prediction.predictions.map(p => ({
        menuItem: {
          _id: p.menuItem._id,
          name: p.menuItem.name,
          price: p.menuItem.price,
          category: p.menuItem.category,
          imageUrl: p.menuItem.imageUrl
        },
        predictedQuantity: p.predictedQuantity,
        confidence: p.confidence,
        factors: p.factors
      })),
      totalPredictedOrders: prediction.totalPredictedOrders,
      totalPredictedRevenue: prediction.totalPredictedRevenue,
      weatherData: prediction.weatherData,
      accuracy: prediction.accuracy,
      createdAt: prediction.createdAt,
      updatedAt: prediction.updatedAt
    });

  } catch (err) {
    console.error("❌ Error in /predictions/current:", err);
    res.status(500).json({
      error: "Failed to fetch current prediction",
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Train Model
// -----------------------------
router.post("/train", protect("admin"), async (req, res) => {
  try {
    console.log("🧠 Starting model training...");
    const count = await PredictionService.collectHistoricalData();
    res.json({
      message: `Model training completed! Collected ${count} data points.`,
      status: "success",
      dataPoints: count,
      timestamp: new Date().toISOString(),
      nextStep: "Use POST /predictions/generate to generate predictions"
    });
  } catch (err) {
    console.error("❌ Training failed:", err);
    res.status(500).json({ 
      error: "Training failed", 
      details: err.message,
      suggestion: "Ensure order history and menu items exist in DB"
    });
  }
});

// -----------------------------
// Generate Prediction Manually
// -----------------------------
router.post("/generate", protect("admin"), async (req, res) => {
  try {
    const { date, hour, predictionFor } = req.body;
    const targetDate = date || predictionFor || new Date();
    const targetHour = hour ?? new Date().getHours();

    if (targetHour < 0 || targetHour > 23) {
      return res.status(400).json({ error: "Invalid hour", provided: targetHour });
    }

    const prediction = await PredictionService.generatePredictions(new Date(targetDate), targetHour);
    const populated = await prediction.populate("predictions.menuItem", "name price category imageUrl");

    res.json({
      message: "Prediction generated successfully",
      prediction: populated,
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error generating prediction:", err);
    res.status(500).json({ 
      error: "Prediction generation failed", 
      details: err.message,
      suggestion: "Train the model and add menu items first"
    });
  }
});

// -----------------------------
// Get All Predictions (History)
// -----------------------------
router.get("/all", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const predictions = await Prediction.find()
      .populate("predictions.menuItem", "name price category imageUrl")
      .sort({ predictionFor: -1, hour: -1 })
      .limit(limit);

    res.json({ predictions, count: predictions.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("❌ Error fetching predictions:", err);
    res.status(500).json({ error: "Failed to fetch predictions", details: err.message });
  }
});

// -----------------------------
// Accuracy Metrics
// -----------------------------
router.get("/accuracy", async (req, res) => {
  try {
    const recentPredictions = await Prediction.find({ accuracy: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .limit(20);

    let overallAccuracy = null;
    let hourlyAccuracy = [];

    if (recentPredictions.length) {
      const totalAccuracy = recentPredictions.reduce((sum, p) => sum + p.accuracy, 0);
      overallAccuracy = totalAccuracy / recentPredictions.length;

      const hourlyData = {};
      recentPredictions.forEach(p => {
        hourlyData[p.hour] ??= { total: 0, count: 0 };
        hourlyData[p.hour].total += p.accuracy;
        hourlyData[p.hour].count += 1;
      });

      hourlyAccuracy = Object.keys(hourlyData).map(hour => ({
        hour: parseInt(hour),
        accuracy: hourlyData[hour].total / hourlyData[hour].count,
        predictions: hourlyData[hour].count
      }));
    }

    res.json({
      overallAccuracy,
      predictionCount: recentPredictions.length,
      hourlyAccuracy,
      recentPredictions: recentPredictions.slice(0, 5).map(p => ({
        id: p._id,
        date: p.predictionFor,
        hour: p.hour,
        accuracy: p.accuracy,
        totalOrders: p.totalPredictedOrders
      })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Accuracy fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch accuracy metrics", details: err.message });
  }
});

// -----------------------------
// Debug Route
// -----------------------------
router.get("/debug", async (req, res) => {
  try {
    const menuItemsCount = await MenuItem.countDocuments();
    const predictionDataCount = await PredictionData.countDocuments();
    const predictionsCount = await Prediction.countDocuments();

    res.json({
      debug: "Prediction system status",
      counts: { menuItems: menuItemsCount, historicalData: predictionDataCount, predictions: predictionsCount },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Debug failed", details: err.message });
  }
});

console.log("✅ Prediction routes loaded");

module.exports = router;
