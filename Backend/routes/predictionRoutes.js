// Backend/routes/predictionRoutes.js - FIXED VERSION
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const PredictionService = require("../services/predictionService");
const PredictionData = require("../models/PredictionData");
const Prediction = require("../models/Prediction");
const MenuItem = require("../models/MenuItem");

console.log("🔧 Loading prediction routes...");

// -----------------------------
// 🔹 Root Route (API Info)
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
// 🔹 Test Route
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
// 🔹 Current Predictions - FIXED
// -----------------------------
router.get("/current", async (req, res) => {
  try {
    console.log("📊 Fetching current predictions...");
    
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Try to fetch existing prediction for current date/hour
    let prediction = await Prediction.findOne({
      predictionFor: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      hour: currentHour
    }).populate("predictions.menuItem", "name price category imageUrl");

    // If no prediction exists, generate automatically
    if (!prediction) {
      console.log("⚡ No existing prediction found, generating new one...");
      try {
        prediction = await PredictionService.generatePredictions(today, currentHour);
        prediction = await prediction.populate("predictions.menuItem", "name price category imageUrl");
      } catch (generateError) {
        console.error("❌ Failed to generate prediction:", generateError.message);
        return res.status(500).json({
          error: "Failed to generate prediction",
          details: generateError.message,
          suggestion: "Try training the model first with POST /predictions/train"
        });
      }
    }

    // Ensure we have the populated data
    if (!prediction.predictions || prediction.predictions.length === 0) {
      return res.status(200).json({
        predictionFor: today,
        hour: currentHour,
        predictions: [],
        totalPredictedOrders: 0,
        totalPredictedRevenue: 0,
        weatherData: await PredictionService.getWeatherData(today),
        message: "No predictions available - please add menu items and train the model"
      });
    }

    // Return the prediction with proper structure
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
// 🔹 Train Model
// -----------------------------
router.post("/train", protect("admin"), async (req, res) => {
  try {
    console.log("🧠 Starting model training...");
    const count = await PredictionService.collectHistoricalData();
    
    res.json({
      message: `Model training completed successfully! Collected ${count} data points.`,
      status: "success",
      dataPoints: count,
      timestamp: new Date().toISOString(),
      nextStep: "Generate predictions with POST /predictions/generate"
    });
  } catch (err) {
    console.error("❌ Training failed:", err);
    res.status(500).json({ 
      error: "Training failed", 
      details: err.message,
      suggestion: "Ensure you have order history and menu items in the database"
    });
  }
});

// -----------------------------
// 🔹 Generate Prediction Manually
// -----------------------------
router.post("/generate", protect("admin"), async (req, res) => {
  try {
    let { date, hour, predictionFor } = req.body;

    // Handle different date formats
    const targetDate = date || predictionFor || new Date();
    const targetHour = hour !== undefined ? hour : new Date().getHours();

    if (targetHour < 0 || targetHour > 23) {
      return res.status(400).json({
        error: "Invalid hour",
        message: "Hour must be between 0 and 23",
        provided: targetHour
      });
    }

    console.log(`🔮 Generating manual prediction for ${targetDate} at hour ${targetHour}`);

    const prediction = await PredictionService.generatePredictions(new Date(targetDate), targetHour);
    const populated = await prediction.populate("predictions.menuItem", "name price category imageUrl");

    res.json({
      message: "Prediction generated successfully",
      prediction: {
        _id: populated._id,
        predictionFor: populated.predictionFor,
        hour: populated.hour,
        predictions: populated.predictions,
        totalPredictedOrders: populated.totalPredictedOrders,
        totalPredictedRevenue: populated.totalPredictedRevenue,
        weatherData: populated.weatherData
      },
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error generating prediction:", err);
    res.status(500).json({ 
      error: "Prediction generation failed", 
      details: err.message,
      suggestion: "Make sure you have trained the model and have menu items available"
    });
  }
});

// -----------------------------
// 🔹 Get All Predictions (history)
// -----------------------------
router.get("/all", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const predictions = await Prediction.find()
      .populate("predictions.menuItem", "name price category imageUrl")
      .sort({ predictionFor: -1, hour: -1 })
      .limit(limit);

    res.json({
      predictions,
      count: predictions.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error fetching predictions:", err);
    res.status(500).json({ 
      error: "Failed to fetch predictions", 
      details: err.message 
    });
  }
});

// -----------------------------
// 🔹 Accuracy Metrics
// -----------------------------
router.get("/accuracy", async (req, res) => {
  try {
    // Get recent predictions with accuracy data
    const recentPredictions = await Prediction.find({ 
      accuracy: { $exists: true, $ne: null } 
    })
    .sort({ createdAt: -1 })
    .limit(20);

    let overallAccuracy = null;
    let hourlyAccuracy = [];

    if (recentPredictions.length > 0) {
      // Calculate overall accuracy
      const totalAccuracy = recentPredictions.reduce((sum, p) => sum + p.accuracy, 0);
      overallAccuracy = totalAccuracy / recentPredictions.length;

      // Group by hour for hourly accuracy
      const hourlyData = {};
      recentPredictions.forEach(p => {
        if (!hourlyData[p.hour]) {
          hourlyData[p.hour] = { total: 0, count: 0 };
        }
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
    res.status(500).json({ 
      error: "Failed to fetch accuracy metrics", 
      details: err.message 
    });
  }
});

// -----------------------------
// 🔹 Debug Route
// -----------------------------
router.get("/debug", async (req, res) => {
  try {
    const menuItemsCount = await MenuItem.countDocuments();
    const predictionDataCount = await PredictionData.countDocuments();
    const predictionsCount = await Prediction.countDocuments();
    
    res.json({
      debug: "Prediction system status",
      counts: {
        menuItems: menuItemsCount,
        historicalData: predictionDataCount,
        predictions: predictionsCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Debug failed", details: err.message });
  }
});

console.log("✅ Prediction routes loaded");

module.exports = router;