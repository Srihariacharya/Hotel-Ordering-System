require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const path = require("path");
const mongoose = require("mongoose");

// ================================
// 🔐 Validate Environment Variables
// ================================
const requiredEnvVars = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// ================================
// 📦 Initialize Express App First
// ================================
const app = express();

// ================================
// 🛡 Global Middleware (Before Routes)
// ================================
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ================================
// 🌐 CORS Settings
// ================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://magical-alpaca-fa7f48.netlify.app",
  process.env.FRONTEND_URL // Add dynamic frontend URL from env
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ================================
// 🚦 Rate Limiting
// ================================
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More restrictive in production
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ================================
// 🌍 Root + Health Check Routes (Early)
// ================================
app.get("/", (_req, res) => {
  res.json({
    message: "🚀 Hotel Ordering API with Smart Predictions",
    version: "2.0.0",
    features: ["Authentication", "Menu Management", "Order Processing", "AI Predictions"],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/health", async (_req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ================================
// 📦 Database Connection with Retry Logic
// ================================
const connectDB = async () => {
  try {
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10, // Connection pool size
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log("✅ MongoDB Connected Successfully");
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    // Retry connection after delay
    console.log("🔄 Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Initialize database connection
connectDB();

// ================================
// 📌 Safe Route Loading Function
// ================================
const safeRouteLoad = (routePath, prefix) => {
  try {
    const routes = require(routePath);
    app.use(prefix, routes);
    console.log(`✅ ${prefix} routes loaded successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to load ${prefix} routes:`, error.message);
    // Create a fallback route for missing route files
    app.use(prefix, (req, res) => {
      res.status(503).json({
        error: `${prefix} service temporarily unavailable`,
        message: "Route module failed to load",
        timestamp: new Date().toISOString()
      });
    });
    return false;
  }
};

// ================================
// 📌 Load Routes with Error Handling
// ================================
const loadRoutes = async () => {
  // Wait for database to be ready before loading routes that might depend on models
  while (mongoose.connection.readyState !== 1) {
    console.log("⏳ Waiting for database connection...");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("📌 Loading application routes...");
  
  safeRouteLoad("./routes/authRoutes", "/auth");
  safeRouteLoad("./routes/menuRoutes", "/menu");
  safeRouteLoad("./routes/orderRoutes", "/order");
  safeRouteLoad("./routes/predictionRoutes", "/predictions");
  
  // Ensure prediction route is also available at /api/prediction
  safeRouteLoad("./routes/predictionRoutes", "/api/prediction");
};

// Load routes
loadRoutes().catch(error => {
  console.error("❌ Error loading routes:", error.message);
});

// ================================
// 👨‍💻 Admin Seeding (Async with proper error handling)
// ================================
const seedAdmin = async () => {
  try {
    // Wait for database and User model to be available
    while (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const User = require("./models/User");
    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin created: admin@example.com / admin123");
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (err) {
    console.error("❌ Admin seeding error:", err.message);
    // Don't exit process, just log the error
  }
};

// Seed admin after a delay to ensure everything is loaded
setTimeout(seedAdmin, 3000);

// ================================
// 🔍 Debug Route
// ================================
app.get("/debug/routes", (req, res) => {
  try {
    const routes = [];

    function extractRoutes(stack, prefix = "") {
      stack.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          routes.push({
            method: methods.join(", ").toUpperCase(),
            path: prefix + layer.route.path,
          });
        } else if (layer.name === "router" && layer.handle && layer.handle.stack) {
          const routerPrefix = layer.regexp.source.replace(/[^a-zA-Z0-9\/]/g, '');
          extractRoutes(layer.handle.stack, routerPrefix);
        }
      });
    }

    if (app._router && app._router.stack) {
      extractRoutes(app._router.stack);
    }

    res.json({
      message: "Available API routes",
      routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      count: routes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate routes list",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================================
// 📦 Serve Frontend (Production)
// ================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "client/build");
  
  // Check if build directory exists
  const fs = require('fs');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    
    app.get("*", (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/auth/') || 
          req.path.startsWith('/menu/') || 
          req.path.startsWith('/order/') || 
          req.path.startsWith('/predictions/') ||
          req.path.startsWith('/health') ||
          req.path.startsWith('/debug/')) {
        return res.status(404).json({ 
          error: "404 Not Found",
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }
      
      res.sendFile(path.join(buildPath, "index.html"));
    });
  } else {
    console.log("⚠️ Frontend build directory not found, serving API only");
  }
}

// ================================
// 🚫 404 Handler
// ================================
app.use((req, res) => {
  console.log("🚫 404 Not Found:", req.method, req.path);
  res.status(404).json({
    error: "404 Not Found",
    path: req.path,
    method: req.method,
    availableRoutes: {
      auth: ["/auth/login", "/auth/register"],
      menu: ["/menu"],
      orders: ["/order"],
      predictions: ["/predictions/current", "/predictions/accuracy"],
      debug: ["/health", "/debug/routes"],
    },
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 💥 Global Error Handler
// ================================
app.use((err, req, res, _next) => {
  console.error("💥 Global Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      details: err 
    }),
  });
});

// ================================
// 🚀 Start Server
// ================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Debug routes: http://localhost:${PORT}/debug/routes`);
  console.log(`🎯 Predictions: http://localhost:${PORT}/predictions/current`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error(`❌ Server error:`, err);
    process.exit(1);
  }
});

// ================================
// ⏰ Start Cron Jobs (Delayed)
// ================================
const initializeCronJobs = () => {
  if (process.env.NODE_ENV !== "test") {
    try {
      require("./jobs/predictionCron");
      console.log("⏰ Prediction cron jobs started successfully");
    } catch (error) {
      console.error("❌ Cron job initialization failed:", error.message);
      // Don't exit process, cron jobs are not critical for basic functionality
    }
  }
};

// Start cron jobs after everything is initialized
setTimeout(initializeCronJobs, 10000); // 10 seconds delay

// ================================
// 🛑 Graceful Shutdown
// ================================
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully`);
  
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error closing server:', err);
      process.exit(1);
    }
    
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    } catch (dbError) {
      console.error('❌ Error closing database:', dbError);
    }
    
    console.log("✅ Server closed successfully");
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;