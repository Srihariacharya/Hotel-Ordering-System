// Backend/routes/predictionRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const PredictionService = require("../services/predictionService"); // ✅ Our updated service
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
// 🔹 Current Predictions
// -----------------------------
router.get("/current", async (req, res) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();

    // Try to fetch existing prediction for current date/hour
    let prediction = await Prediction.findOne({
      predictionFor: {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lt: new Date(now.setHours(23, 59, 59, 999))
      },
      hour: currentHour
    }).populate("predictions.menuItem", "name price category");

    // If no prediction exists, generate automatically using PredictionService
    if (!prediction) {
      prediction = await PredictionService.generatePredictions(new Date(), currentHour);
      prediction = await prediction.populate("predictions.menuItem", "name price category");
    }

    res.json(prediction);
  } catch (err) {
    console.error("❌ Error fetching current prediction:", err.message);
    res.status(500).json({
      error: "Failed to fetch current prediction",
      details: err.message,
    });
  }
});

// -----------------------------
// 🔹 Train Model
// -----------------------------
router.post("/train", protect("admin"), async (req, res) => {
  try {
    const count = await PredictionService.collectHistoricalData();
    res.json({
      message: `Model training completed. Collected ${count} data points.`,
      status: "success",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Training failed:", err.message);
    res.status(500).json({ error: "Training failed", details: err.message });
  }
});

// -----------------------------
// 🔹 Generate Prediction Manually
// -----------------------------
router.post("/generate", protect("admin"), async (req, res) => {
  try {
    const { date, hour } = req.body;

    if (!date || hour === undefined) {
      return res.status(400).json({
        error: "Missing required fields",
        required: { date: "YYYY-MM-DD", hour: "0-23" },
      });
    }

    if (hour < 0 || hour > 23) {
      return res.status(400).json({
        error: "Invalid hour",
        message: "Hour must be between 0 and 23",
      });
    }

    const prediction = await PredictionService.generatePredictions(new Date(date), hour);
    const populated = await prediction.populate("predictions.menuItem", "name price category");

    res.json({
      message: "Prediction generated successfully",
      prediction: populated,
      status: "success",
    });
  } catch (err) {
    console.error("❌ Error generating prediction:", err.message);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

// -----------------------------
// 🔹 Accuracy Metrics (placeholder)
// -----------------------------
router.get("/accuracy", protect("admin"), async (req, res) => {
  try {
    // You can later calculate real accuracy from Prediction collection
    res.json({
      overallAccuracy: null,
      predictionCount: 0,
      hourlyAccuracy: [],
      recentPredictions: [],
      note: "Accuracy metrics not yet implemented",
    });
  } catch (err) {
    console.error("❌ Accuracy fetch failed:", err.message);
    res.status(500).json({ error: "Accuracy fetch failed", details: err.message });
  }
});

// -----------------------------
// 🔹 Get All Predictions (history)
// -----------------------------
router.get("/all", protect("admin"), async (req, res) => {
  try {
    const predictions = await Prediction.find()
      .populate("predictions.menuItem", "name price category")
      .sort({ predictionFor: -1, hour: 1 });

    res.json(predictions);
  } catch (err) {
    console.error("❌ Error fetching predictions:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

console.log("✅ Prediction routes loaded");

module.exports = router;
