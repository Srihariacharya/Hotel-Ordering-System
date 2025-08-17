const express = require("express");
const router = express.Router();

console.log("🔧 Loading prediction routes...");

// Safe import function to handle missing dependencies
const safeImport = (modulePath, defaultValue = null) => {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(`⚠️ Warning: Could not import ${modulePath}:`, error.message);
    return defaultValue;
  }
};

// Import dependencies safely
const { protect } = safeImport("../middleware/authMiddleware", { protect: () => (req, res, next) => next() });
const PredictionService = safeImport("../services/predictionService");
const PredictionData = safeImport("../models/PredictionData");
const Prediction = safeImport("../models/Prediction");
const MenuItem = safeImport("../models/MenuItem");

// Check if critical dependencies are available
const dependenciesAvailable = PredictionService && Prediction && MenuItem;

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
      "GET /predictions/all",
      "GET /predictions/debug"
    ],
    status: dependenciesAvailable ? "All routes available" : "Limited functionality - some dependencies missing",
    dependencies: {
      predictionService: !!PredictionService,
      predictionModel: !!Prediction,
      menuItemModel: !!MenuItem,
      authMiddleware: !!protect
    },
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
    dependencies: {
      available: dependenciesAvailable,
      predictionService: !!PredictionService,
      models: !!(Prediction && MenuItem)
    }
  });
});

// -----------------------------
// 🔹 Current Predictions - SAFE VERSION
// -----------------------------
router.get("/current", async (req, res) => {
  try {
    console.log("📊 Fetching current predictions...");
    
    if (!dependenciesAvailable) {
      return res.status(503).json({
        error: "Service temporarily unavailable",
        message: "Prediction dependencies are not loaded",
        timestamp: new Date().toISOString()
      });
    }

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
    }).populate("predictions.menuItem", "name price category imageUrl").catch(err => {
      console.warn("Failed to populate menuItem:", err.message);
      return null;
    });

    // If no prediction exists, try to generate automatically
    if (!prediction && PredictionService && typeof PredictionService.generatePredictions === 'function') {
      console.log("⚡ No existing prediction found, generating new one...");
      try {
        prediction = await PredictionService.generatePredictions(today, currentHour);
        if (prediction && typeof prediction.populate === 'function') {
          prediction = await prediction.populate("predictions.menuItem", "name price category imageUrl");
        }
      } catch (generateError) {
        console.error("❌ Failed to generate prediction:", generateError.message);
        return res.status(500).json({
          error: "Failed to generate prediction",
          details: generateError.message,
          suggestion: "Try training the model first with POST /predictions/train"
        });
      }
    }

    // Handle case where no prediction is available
    if (!prediction) {
      return res.status(200).json({
        predictionFor: today,
        hour: currentHour,
        predictions: [],
        totalPredictedOrders: 0,
        totalPredictedRevenue: 0,
        weatherData: null,
        message: "No predictions available - please add menu items and train the model"
      });
    }

    // Ensure we have valid predictions array
    const predictions = prediction.predictions || [];

    // Return the prediction with safe structure
    res.json({
      _id: prediction._id,
      predictionFor: prediction.predictionFor,
      hour: prediction.hour,
      predictions: predictions.map(p => {
        const menuItem = p.menuItem || {};
        return {
          menuItem: {
            _id: menuItem._id || null,
            name: menuItem.name || "Unknown Item",
            price: menuItem.price || 0,
            category: menuItem.category || "Unknown",
            imageUrl: menuItem.imageUrl || null
          },
          predictedQuantity: p.predictedQuantity || 0,
          confidence: p.confidence || 0,
          factors: p.factors || {}
        };
      }),
      totalPredictedOrders: prediction.totalPredictedOrders || 0,
      totalPredictedRevenue: prediction.totalPredictedRevenue || 0,
      weatherData: prediction.weatherData || null,
      accuracy: prediction.accuracy || null,
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
router.post("/train", async (req, res) => {
  try {
    // Apply protection if available
    if (protect && typeof protect === 'function') {
      const authResult = protect("admin")(req, res, () => {});
      if (authResult === false) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    if (!PredictionService || typeof PredictionService.collectHistoricalData !== 'function') {
      return res.status(503).json({
        error: "Service unavailable",
        message: "PredictionService not available",
        timestamp: new Date().toISOString()
      });
    }

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
router.post("/generate", async (req, res) => {
  try {
    // Apply protection if available
    if (protect && typeof protect === 'function') {
      const authResult = protect("admin")(req, res, () => {});
      if (authResult === false) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    if (!PredictionService || typeof PredictionService.generatePredictions !== 'function') {
      return res.status(503).json({
        error: "Service unavailable", 
        message: "PredictionService not available"
      });
    }

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
    let populated = prediction;

    if (prediction && typeof prediction.populate === 'function') {
      populated = await prediction.populate("predictions.menuItem", "name price category imageUrl");
    }

    res.json({
      message: "Prediction generated successfully",
      prediction: {
        _id: populated._id,
        predictionFor: populated.predictionFor,
        hour: populated.hour,
        predictions: populated.predictions || [],
        totalPredictedOrders: populated.totalPredictedOrders || 0,
        totalPredictedRevenue: populated.totalPredictedRevenue || 0,
        weatherData: populated.weatherData || null
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
    if (!Prediction) {
      return res.status(503).json({
        error: "Service unavailable",
        message: "Prediction model not available"
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Cap at 100
    const predictions = await Prediction.find()
      .populate("predictions.menuItem", "name price category imageUrl")
      .sort({ predictionFor: -1, hour: -1 })
      .limit(limit)
      .catch(err => {
        console.warn("Failed to populate in /all:", err.message);
        return Prediction.find()
          .sort({ predictionFor: -1, hour: -1 })
          .limit(limit);
      });

    res.json({
      predictions: predictions || [],
      count: predictions ? predictions.length : 0,
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
    if (!Prediction) {
      return res.status(503).json({
        error: "Service unavailable",
        message: "Prediction model not available"
      });
    }

    // Get recent predictions with accuracy data
    const recentPredictions = await Prediction.find({ 
      accuracy: { $exists: true, $ne: null } 
    })
    .sort({ createdAt: -1 })
    .limit(20);

    let overallAccuracy = null;
    let hourlyAccuracy = [];

    if (recentPredictions && recentPredictions.length > 0) {
      // Calculate overall accuracy
      const totalAccuracy = recentPredictions.reduce((sum, p) => sum + (p.accuracy || 0), 0);
      overallAccuracy = totalAccuracy / recentPredictions.length;

      // Group by hour for hourly accuracy
      const hourlyData = {};
      recentPredictions.forEach(p => {
        const hour = p.hour;
        if (hour !== undefined && hour !== null) {
          if (!hourlyData[hour]) {
            hourlyData[hour] = { total: 0, count: 0 };
          }
          hourlyData[hour].total += p.accuracy || 0;
          hourlyData[hour].count += 1;
        }
      });

      hourlyAccuracy = Object.keys(hourlyData).map(hour => ({
        hour: parseInt(hour),
        accuracy: hourlyData[hour].count > 0 ? hourlyData[hour].total / hourlyData[hour].count : 0,
        predictions: hourlyData[hour].count
      }));
    }

    res.json({
      overallAccuracy,
      predictionCount: recentPredictions ? recentPredictions.length : 0,
      hourlyAccuracy,
      recentPredictions: recentPredictions ? recentPredictions.slice(0, 5).map(p => ({
        id: p._id,
        date: p.predictionFor,
        hour: p.hour,
        accuracy: p.accuracy,
        totalOrders: p.totalPredictedOrders || 0
      })) : [],
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
    const counts = {
      menuItems: 0,
      historicalData: 0,
      predictions: 0
    };

    // Safe counting with error handling
    if (MenuItem) {
      try {
        counts.menuItems = await MenuItem.countDocuments();
      } catch (err) {
        console.warn("Failed to count menu items:", err.message);
      }
    }

    if (PredictionData) {
      try {
        counts.historicalData = await PredictionData.countDocuments();
      } catch (err) {
        console.warn("Failed to count prediction data:", err.message);
      }
    }

    if (Prediction) {
      try {
        counts.predictions = await Prediction.countDocuments();
      } catch (err) {
        console.warn("Failed to count predictions:", err.message);
      }
    }
    
    res.json({
      debug: "Prediction system status",
      counts,
      dependencies: {
        predictionService: !!PredictionService,
        predictionModel: !!Prediction,
        predictionDataModel: !!PredictionData,
        menuItemModel: !!MenuItem,
        authMiddleware: !!protect
      },
      status: dependenciesAvailable ? "operational" : "degraded",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Debug failed:", err);
    res.status(500).json({ 
      error: "Debug failed", 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// 🔹 Fallback route for undefined paths
// -----------------------------
router.use("*", (req, res) => {
  res.status(404).json({
    error: "Prediction route not found",
    path: req.originalUrl,
    availableRoutes: ["/", "/test", "/current", "/train", "/generate", "/all", "/accuracy", "/debug"],
    timestamp: new Date().toISOString()
  });
});

console.log("✅ Prediction routes loaded safely");

module.exports = router;