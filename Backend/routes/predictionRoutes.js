// Backend/routes/predictionRoutes.js - FULLY UPDATED & FIXED VERSION
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const predictionErrorHandler = require("../middleware/predictionErrorHandler");
const PredictionService = require("../services/predictionService");
const PredictionData = require("../models/PredictionData");
const Prediction = require("../models/Prediction");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");

console.log("🔧 Loading prediction routes...");

// Apply prediction error handler to all routes
router.use(predictionErrorHandler);

// -----------------------------
// Root Route (API Info)
// -----------------------------
router.get("/", (req, res) => {
  res.json({
    message: "🤖 Smart Prediction API Routes",
    version: "2.0.0",
    routes: [
      "GET /predictions/test - Test endpoint",
      "GET /predictions/current - Get current hour prediction",
      "GET /predictions/forecast/:hours - Get forecast for next X hours",
      "POST /predictions/train - Train model (Admin only)",
      "POST /predictions/generate - Generate specific prediction (Admin only)",
      "GET /predictions/accuracy - Get accuracy metrics",
      "GET /predictions/all - Get prediction history",
      "GET /predictions/stats - Get prediction statistics",
      "GET /predictions/debug - Debug information"
    ],
    status: "✅ All routes operational",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// Test Route
// -----------------------------
router.get("/test", (req, res) => {
  console.log("✅ GET /predictions/test called");
  res.json({
    message: "🎯 Prediction routes are working perfectly!",
    timestamp: new Date().toISOString(),
    route: "test",
    status: "healthy",
    version: "2.0.0"
  });
});

// -----------------------------
// Current Predictions (Public - No Auth Required)
// -----------------------------
router.get("/current", async (req, res) => {
  try {
    console.log("📊 Fetching current predictions...");
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Try to find existing prediction for current hour
    let prediction = await Prediction.findOne({
      predictionFor: { 
        $gte: today, 
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
      },
      hour: currentHour
    }).populate("predictions.menuItem", "name price category imageUrl");

    // If no prediction exists, generate one
    if (!prediction) {
      console.log("⚡ No existing prediction found, generating new one...");
      try {
        prediction = await PredictionService.generatePredictions(today, currentHour);
        if (prediction) {
          prediction = await prediction.populate("predictions.menuItem", "name price category imageUrl");
        }
      } catch (generateError) {
        console.error("❌ Failed to generate prediction:", generateError.message);
        
        // Return empty prediction structure instead of failing
        return res.json({
          predictionFor: today,
          hour: currentHour,
          predictions: [],
          totalPredictedOrders: 0,
          totalPredictedRevenue: 0,
          weatherData: await PredictionService.getWeatherData(today),
          message: "Unable to generate predictions. Please ensure menu items exist and try training the model.",
          error: generateError.message,
          suggestion: "1. Add menu items via admin panel, 2. POST /predictions/train, 3. Retry"
        });
      }
    }

    // Handle case where prediction exists but has no items
    if (!prediction || !prediction.predictions || prediction.predictions.length === 0) {
      console.log("⚠️ Prediction exists but has no items");
      return res.json({
        predictionFor: today,
        hour: currentHour,
        predictions: [],
        totalPredictedOrders: 0,
        totalPredictedRevenue: 0,
        weatherData: await PredictionService.getWeatherData(today),
        message: "No predictions available for this time slot",
        suggestion: "Add menu items and train the model to get predictions"
      });
    }

    // Return successful prediction
    console.log(`✅ Returning prediction with ${prediction.predictions.length} items`);
    
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
        factors: p.factors || []
      })),
      totalPredictedOrders: prediction.totalPredictedOrders,
      totalPredictedRevenue: prediction.totalPredictedRevenue,
      weatherData: prediction.weatherData,
      accuracy: prediction.accuracy,
      isHoliday: prediction.isHoliday,
      createdAt: prediction.createdAt,
      updatedAt: prediction.updatedAt
    });

  } catch (error) {
    console.error("❌ Error in /predictions/current:", error);
    res.status(500).json({
      error: "Failed to fetch current prediction",
      message: error.message,
      timestamp: new Date().toISOString(),
      suggestion: "Check server logs and ensure database connection is working"
    });
  }
});

// -----------------------------
// Forecast for Next X Hours
// -----------------------------
router.get("/forecast/:hours", async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.params.hours) || 6, 24); // Max 24 hours
    console.log(`📈 Generating ${hours}-hour forecast...`);

    const now = new Date();
    const forecasts = [];

    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const futureDate = new Date(futureTime.getFullYear(), futureTime.getMonth(), futureTime.getDate());
      const futureHour = futureTime.getHours();

      try {
        let prediction = await Prediction.findOne({
          predictionFor: {
            $gte: futureDate,
            $lt: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000)
          },
          hour: futureHour
        }).populate("predictions.menuItem", "name price category");

        if (!prediction) {
          prediction = await PredictionService.generatePredictions(futureDate, futureHour);
          if (prediction) {
            prediction = await prediction.populate("predictions.menuItem", "name price category");
          }
        }

        if (prediction && prediction.predictions && prediction.predictions.length > 0) {
          forecasts.push({
            _id: prediction._id,
            dateTime: futureTime,
            hour: futureHour,
            totalPredictedOrders: prediction.totalPredictedOrders,
            totalPredictedRevenue: prediction.totalPredictedRevenue,
            topItems: prediction.predictions
              .sort((a, b) => b.predictedQuantity - a.predictedQuantity)
              .slice(0, 5)
              .map(p => ({
                name: p.menuItem.name,
                quantity: p.predictedQuantity,
                confidence: p.confidence
              })),
            weatherData: prediction.weatherData
          });
        }
      } catch (predError) {
        console.warn(`⚠️ Failed to generate prediction for hour ${i}:`, predError.message);
        forecasts.push({
          dateTime: futureTime,
          hour: futureHour,
          error: "Prediction unavailable",
          totalPredictedOrders: 0,
          totalPredictedRevenue: 0
        });
      }
    }

    res.json({
      message: `Forecast for next ${hours} hours`,
      forecasts,
      generatedAt: new Date().toISOString(),
      summary: {
        totalForecasts: forecasts.length,
        totalPredictedOrders: forecasts.reduce((sum, f) => sum + (f.totalPredictedOrders || 0), 0),
        totalPredictedRevenue: forecasts.reduce((sum, f) => sum + (f.totalPredictedRevenue || 0), 0)
      }
    });

  } catch (error) {
    console.error("❌ Error generating forecast:", error);
    res.status(500).json({
      error: "Failed to generate forecast",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Train Model (Admin Only)
// -----------------------------
router.post("/train", protect("admin"), async (req, res) => {
  try {
    console.log(`🧠 Model training initiated by admin: ${req.user.name}`);
    
    // Check prerequisites
    const menuItemCount = await MenuItem.countDocuments();
    const orderCount = await Order.countDocuments();
    
    if (menuItemCount === 0) {
      return res.status(400).json({
        error: "No menu items found",
        message: "Please add menu items before training the model",
        suggestion: "Use the admin panel to add menu items first"
      });
    }

    if (orderCount === 0) {
      console.log("⚠️ No historical orders found, but proceeding with training...");
    }

    const startTime = Date.now();
    const dataPoints = await PredictionService.collectHistoricalData();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Model training completed in ${duration}ms`);
    
    res.json({
      message: `🎉 Model training completed successfully!`,
      details: {
        dataPointsCollected: dataPoints,
        menuItems: menuItemCount,
        historicalOrders: orderCount,
        trainingDuration: `${duration}ms`,
        trainedBy: req.user.name,
        timestamp: new Date().toISOString()
      },
      status: "success",
      nextSteps: [
        "Model is now ready to generate predictions",
        "Use GET /predictions/current to see current predictions",
        "Use POST /predictions/generate to create specific predictions"
      ]
    });
  } catch (error) {
    console.error("❌ Training failed:", error);
    res.status(500).json({
      error: "Model training failed",
      message: error.message,
      details: error.stack,
      suggestions: [
        "Ensure menu items exist in the database",
        "Check database connectivity",
        "Verify that orders have valid menu item references"
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Generate Specific Prediction (Admin Only)
// -----------------------------
router.post("/generate", protect("admin"), async (req, res) => {
  try {
    const { date, hour, predictionFor } = req.body;
    
    // Parse and validate inputs
    let targetDate = date || predictionFor || new Date();
    let targetHour = hour !== undefined ? parseInt(hour) : new Date().getHours();
    
    if (typeof targetDate === 'string') {
      targetDate = new Date(targetDate);
    }
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date format",
        message: "Please provide a valid date",
        example: "2024-01-15 or new Date()"
      });
    }
    
    if (targetHour < 0 || targetHour > 23) {
      return res.status(400).json({
        error: "Invalid hour",
        message: "Hour must be between 0 and 23",
        provided: targetHour
      });
    }

    console.log(`🔮 Admin ${req.user.name} generating prediction for ${targetDate.toDateString()} at ${targetHour}:00`);

    const startTime = Date.now();
    const prediction = await PredictionService.generatePredictions(targetDate, targetHour);
    const duration = Date.now() - startTime;
    
    const populatedPrediction = await prediction.populate("predictions.menuItem", "name price category imageUrl");

    console.log(`✅ Prediction generated in ${duration}ms`);

    res.json({
      message: "🎯 Prediction generated successfully!",
      prediction: {
        _id: populatedPrediction._id,
        predictionFor: populatedPrediction.predictionFor,
        hour: populatedPrediction.hour,
        predictions: populatedPrediction.predictions,
        totalPredictedOrders: populatedPrediction.totalPredictedOrders,
        totalPredictedRevenue: populatedPrediction.totalPredictedRevenue,
        weatherData: populatedPrediction.weatherData,
        isHoliday: populatedPrediction.isHoliday,
        createdAt: populatedPrediction.createdAt
      },
      metadata: {
        generatedBy: req.user.name,
        generationTime: `${duration}ms`,
        itemCount: populatedPrediction.predictions.length,
        avgConfidence: populatedPrediction.predictions.length > 0 
          ? (populatedPrediction.predictions.reduce((sum, p) => sum + p.confidence, 0) / populatedPrediction.predictions.length).toFixed(3)
          : 0
      },
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error generating prediction:", error);
    res.status(500).json({
      error: "Prediction generation failed",
      message: error.message,
      suggestions: [
        "Ensure the model has been trained (POST /predictions/train)",
        "Verify menu items exist and are available",
        "Check that the date and hour are valid"
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Get All Predictions (History)
// -----------------------------
router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'predictionFor';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    console.log(`📋 Fetching predictions: page ${page}, limit ${limit}, sort by ${sortBy}`);

    const [predictions, totalCount] = await Promise.all([
      Prediction.find()
        .populate("predictions.menuItem", "name price category imageUrl")
        .sort({ [sortBy]: sortOrder, hour: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prediction.countDocuments()
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      predictions: predictions.map(p => ({
        _id: p._id,
        predictionFor: p.predictionFor,
        hour: p.hour,
        totalPredictedOrders: p.totalPredictedOrders,
        totalPredictedRevenue: p.totalPredictedRevenue,
        itemCount: p.predictions?.length || 0,
        avgConfidence: p.predictions && p.predictions.length > 0
          ? (p.predictions.reduce((sum, item) => sum + (item.confidence || 0), 0) / p.predictions.length).toFixed(2)
          : 0,
        accuracy: p.accuracy,
        weatherData: p.weatherData,
        createdAt: p.createdAt
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching predictions:", error);
    res.status(500).json({
      error: "Failed to fetch predictions",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Prediction Statistics
// -----------------------------
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Calculating prediction statistics...");
    
    const [basicStats, accuracyStats, recentStats] = await Promise.all([
      // Basic counts
      Promise.all([
        Prediction.countDocuments(),
        PredictionData.countDocuments(),
        MenuItem.countDocuments({ isAvailable: true }),
        Order.countDocuments()
      ]),
      
      // Accuracy statistics
      Prediction.aggregate([
        { $match: { accuracy: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgAccuracy: { $avg: '$accuracy' },
            minAccuracy: { $min: '$accuracy' },
            maxAccuracy: { $max: '$accuracy' },
            accuracyCount: { $sum: 1 }
          }
        }
      ]),
      
      // Recent predictions (last 24 hours)
      Prediction.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).select('totalPredictedOrders totalPredictedRevenue createdAt')
    ]);

    const [totalPredictions, totalHistoricalData, availableMenuItems, totalOrders] = basicStats;
    const accuracy = accuracyStats[0] || { avgAccuracy: null, minAccuracy: null, maxAccuracy: null, accuracyCount: 0 };

    const stats = {
      overview: {
        totalPredictions,
        totalHistoricalData,
        availableMenuItems,
        totalOrders,
        systemStatus: totalPredictions > 0 ? 'active' : 'needs_training'
      },
      accuracy: {
        average: accuracy.avgAccuracy ? (accuracy.avgAccuracy * 100).toFixed(2) + '%' : 'N/A',
        range: accuracy.minAccuracy && accuracy.maxAccuracy 
          ? `${(accuracy.minAccuracy * 100).toFixed(1)}% - ${(accuracy.maxAccuracy * 100).toFixed(1)}%`
          : 'N/A',
        predictionsWithAccuracy: accuracy.accuracyCount
      },
      recent24Hours: {
        predictionsGenerated: recentStats.length,
        totalPredictedOrders: recentStats.reduce((sum, p) => sum + (p.totalPredictedOrders || 0), 0),
        totalPredictedRevenue: recentStats.reduce((sum, p) => sum + (p.totalPredictedRevenue || 0), 0),
        avgOrdersPerPrediction: recentStats.length > 0 
          ? (recentStats.reduce((sum, p) => sum + (p.totalPredictedOrders || 0), 0) / recentStats.length).toFixed(1)
          : 0
      },
      recommendations: []
    };

    // Add recommendations
    if (totalPredictions === 0) {
      stats.recommendations.push("Generate your first prediction using POST /predictions/generate");
    }
    if (totalHistoricalData < 10) {
      stats.recommendations.push("Run POST /predictions/train to collect more historical data");
    }
    if (availableMenuItems === 0) {
      stats.recommendations.push("Add menu items via admin panel for better predictions");
    }
    if (accuracy.accuracyCount === 0) {
      stats.recommendations.push("Wait for predictions to mature to see accuracy metrics");
    }

    res.json({
      message: "📈 Prediction System Statistics",
      stats,
      timestamp: new Date().toISOString(),
      generatedIn: Date.now() - req.startTime || 0
    });

  } catch (error) {
    console.error("❌ Error calculating stats:", error);
    res.status(500).json({
      error: "Failed to calculate statistics",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Accuracy Metrics
// -----------------------------
router.get("/accuracy", async (req, res) => {
  try {
    console.log("📊 Fetching prediction accuracy metrics...");

    const limit = parseInt(req.query.limit) || 50;
    const days = parseInt(req.query.days) || 30;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [recentPredictions, hourlyAccuracy, dailyAccuracy] = await Promise.all([
      // Recent predictions with accuracy
      Prediction.find({ 
        accuracy: { $exists: true, $ne: null },
        createdAt: { $gte: fromDate }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('predictionFor hour accuracy totalPredictedOrders createdAt')
      .lean(),

      // Hourly accuracy breakdown
      Prediction.aggregate([
        { 
          $match: { 
            accuracy: { $exists: true, $ne: null },
            createdAt: { $gte: fromDate }
          } 
        },
        {
          $group: {
            _id: '$hour',
            avgAccuracy: { $avg: '$accuracy' },
            count: { $sum: 1 },
            minAccuracy: { $min: '$accuracy' },
            maxAccuracy: { $max: '$accuracy' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Daily accuracy trend
      Prediction.aggregate([
        { 
          $match: { 
            accuracy: { $exists: true, $ne: null },
            createdAt: { $gte: fromDate }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            avgAccuracy: { $avg: '$accuracy' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Calculate overall metrics
    let overallAccuracy = null;
    let totalPredictions = 0;

    if (recentPredictions.length > 0) {
      const totalAccuracy = recentPredictions.reduce((sum, p) => sum + p.accuracy, 0);
      overallAccuracy = totalAccuracy / recentPredictions.length;
      totalPredictions = recentPredictions.length;
    }

    res.json({
      message: "🎯 Prediction Accuracy Analysis",
      period: `Last ${days} days`,
      overall: {
        accuracy: overallAccuracy ? `${(overallAccuracy * 100).toFixed(2)}%` : 'N/A',
        totalPredictions,
        period: `${days} days`
      },
      hourly: hourlyAccuracy.map(h => ({
        hour: h._id,
        accuracy: `${(h.avgAccuracy * 100).toFixed(1)}%`,
        predictions: h.count,
        range: `${(h.minAccuracy * 100).toFixed(1)}% - ${(h.maxAccuracy * 100).toFixed(1)}%`
      })),
      daily: dailyAccuracy.map(d => ({
        date: d._id,
        accuracy: `${(d.avgAccuracy * 100).toFixed(1)}%`,
        predictions: d.count
      })),
      recentPredictions: recentPredictions.slice(0, 10).map(p => ({
        id: p._id,
        date: p.predictionFor,
        hour: p.hour,
        accuracy: `${(p.accuracy * 100).toFixed(1)}%`,
        totalOrders: p.totalPredictedOrders,
        createdAt: p.createdAt
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error fetching accuracy metrics:", error);
    res.status(500).json({
      error: "Failed to fetch accuracy metrics",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Debug Information
// -----------------------------
router.get("/debug", async (req, res) => {
  try {
    console.log("🔍 Generating debug information...");

    const [counts, sampleData, systemInfo] = await Promise.all([
      // Get counts
      Promise.all([
        MenuItem.countDocuments(),
        MenuItem.countDocuments({ isAvailable: true }),
        Order.countDocuments(),
        PredictionData.countDocuments(),
        Prediction.countDocuments()
      ]),
      
      // Sample data
      Promise.all([
        MenuItem.findOne().select('name price category isAvailable'),
        Order.findOne().populate('items.menuItem', 'name').select('totalAmount createdAt'),
        PredictionData.findOne().select('date hour totalOrderCount'),
        Prediction.findOne().populate('predictions.menuItem', 'name').select('predictionFor hour predictions')
      ]),
      
      // System information
      {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    ]);

    const [totalMenuItems, availableMenuItems, totalOrders, totalPredictionData, totalPredictions] = counts;
    const [sampleMenuItem, sampleOrder, samplePredictionData, samplePrediction] = sampleData;

    const debugInfo = {
      status: "🟢 System Operational",
      database: {
        menuItems: { total: totalMenuItems, available: availableMenuItems },
        orders: totalOrders,
        predictionData: totalPredictionData,
        predictions: totalPredictions
      },
      samples: {
        menuItem: sampleMenuItem ? {
          name: sampleMenuItem.name,
          price: sampleMenuItem.price,
          category: sampleMenuItem.category,
          available: sampleMenuItem.isAvailable
        } : null,
        order: sampleOrder ? {
          totalAmount: sampleOrder.totalAmount,
          itemCount: sampleOrder.items?.length || 0,
          date: sampleOrder.createdAt
        } : null,
        predictionData: samplePredictionData ? {
          date: samplePredictionData.date,
          hour: samplePredictionData.hour,
          orderCount: samplePredictionData.totalOrderCount
        } : null,
        prediction: samplePrediction ? {
          date: samplePrediction.predictionFor,
          hour: samplePrediction.hour,
          itemCount: samplePrediction.predictions?.length || 0
        } : null
      },
      system: systemInfo,
      health: {
        canGeneratePredictions: availableMenuItems > 0,
        hasTrainingData: totalOrders > 0,
        hasHistoricalData: totalPredictionData > 0,
        hasPredictions: totalPredictions > 0
      },
      recommendations: []
    };

    // Add recommendations
    if (availableMenuItems === 0) {
      debugInfo.recommendations.push("❌ Add menu items to enable predictions");
    }
    if (totalOrders === 0) {
      debugInfo.recommendations.push("⚠️ No orders found - predictions will be basic");
    }
    if (totalPredictionData === 0) {
      debugInfo.recommendations.push("🔄 Run POST /predictions/train to collect historical data");
    }
    if (totalPredictions === 0) {
      debugInfo.recommendations.push("🎯 Generate predictions with POST /predictions/generate");
    }
    
    if (debugInfo.recommendations.length === 0) {
      debugInfo.recommendations.push("✅ System is ready for full operation!");
    }

    res.json(debugInfo);

  } catch (error) {
    console.error("❌ Debug information error:", error);
    res.status(500).json({
      status: "🔴 System Error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------
// Manual Accuracy Update (Admin Only)
// -----------------------------
router.post("/update-accuracy/:id", protect("admin"), async (req, res) => {
  try {
    const { actualOrders } = req.body;
    const predictionId = req.params.id;

    if (!actualOrders || !Array.isArray(actualOrders)) {
      return res.status(400).json({
        error: "Invalid actual orders data",
        message: "Please provide actualOrders as an array"
      });
    }

    console.log(`🎯 Admin ${req.user.name} updating accuracy for prediction ${predictionId}`);

    const updatedAccuracy = await PredictionService.updatePredictionAccuracy(predictionId, actualOrders);

    if (updatedAccuracy !== undefined) {
      res.json({
        message: "✅ Prediction accuracy updated successfully",
        predictionId,
        accuracy: `${(updatedAccuracy * 100).toFixed(2)}%`,
        updatedBy: req.user.name,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: "Prediction not found",
        message: "Could not find prediction with the specified ID"
      });
    }

  } catch (error) {
    console.error("❌ Error updating accuracy:", error);
    res.status(500).json({
      error: "Failed to update accuracy",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add request timing middleware
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

console.log("✅ Prediction routes loaded successfully");

module.exports = router;