require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const path = require("path");
const mongoose = require("mongoose");
const net = require("net");

const connectDB = require("./config/db");
const User = require("./models/User");


const requiredEnvVars = ['MONGO_URI', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);


if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  console.error('Please check your .env file and ensure all required variables are set:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

console.log('All required environment variables are present');

const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log(' Database connection established');
    
    // Test the connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      throw new Error(`Database connection state: ${dbState} (expected: 1)`);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('authentication')) {
      console.error('Check your MongoDB username and password');
    } else if (error.message.includes('network')) {
      console.error(' Check your internet connection and MongoDB URI');
    } else if (error.message.includes('timeout')) {
      console.error('Database connection timed out - check firewall settings');
    }
    
    process.exit(1);
  }
};

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    // Log large payloads for debugging
    if (buf.length > 1024 * 1024) { // 1MB
      console.warn(`⚠️ Large payload received: ${buf.length} bytes from ${req.ip}`);
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, 'frontend/build')));
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://magical-alpaca-fa7f48.netlify.app",
  process.env.FRONTEND_URL 
].filter(Boolean); // Remove undefined values

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      console.log(' Request with no origin allowed (mobile/API client)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS allowed for origin: ${origin}`);
      return callback(null, true);
    }
    
    // Log blocked requests for debugging
    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(new Error(`CORS policy violation: Origin ${origin} is not allowed`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      console.warn(`🚦 Rate limit exceeded for ${req.ip} on ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// General rate limiting
app.use(createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  200, // requests per window
  "Too many requests from this IP, please try again later."
));

// Stricter rate limiting for auth routes
app.use('/auth', createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // requests per window
  "Too many authentication attempts, please try again later."
));

// ================================
// 🔍 Request Logging Middleware
// ================================
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`${req.method} ${req.path} from ${req.ip}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '💥' : status >= 400 ? '⚠️' : '✅';
    console.log(`${statusEmoji} ${req.method} ${req.path} ${status} (${duration}ms)`);
  });
  
  next();
});

const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12); // Increased salt rounds
    await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: true
    });
    
    console.log(` Default admin created: ${adminEmail} / ${adminPassword}`);
    console.log(' Please change the default admin password after first login');
  } catch (err) {
    console.error("Admin seeding error:", err.message);
  }
};


app.get("/", (req, res) => {
  res.json({
    message: "🚀 Hotel Ordering API with Smart Predictions",
    version: "2.1.0",
    features: [
      "🔐 JWT Authentication with Refresh Tokens",
      "🍽️ Menu Management System",
      "📦 Order Processing & Tracking",
      "🤖 AI-Powered Demand Predictions",
      "📊 Advanced Analytics Dashboard",
      "⏰ Automated Cron Jobs",
      "🛡️ Enhanced Security & Rate Limiting"
    ],
    endpoints: {
      auth: "/auth/*",
      menu: "/menu/*", 
      orders: "/order/*",
      predictions: "/predictions/*",
      health: "/health",
      debug: "/debug/routes"
    },
    documentation: "Check /debug/routes for all available endpoints",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const memoryUsage = process.memoryUsage();
    
    // Check database connectivity
    let dbResponseTime = null;
    if (dbStatus === "connected") {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - start;
    }

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())} seconds`,
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        responseTime: dbResponseTime ? `${dbResponseTime}ms` : null
      },
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      version: "2.1.0"
    };

    // Add warning if database is slow
    if (dbResponseTime > 1000) {
      health.warnings = ["Database response time is slow"];
    }

    res.json(health);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ================================
// 📌 Enhanced Safe Route Loader
// ================================
const safeRouteLoad = (routePath, prefix) => {
  try {
    const routes = require(routePath);
    app.use(prefix, routes);
    console.log(`✅ ${prefix} routes loaded from ${routePath}`);
  } catch (error) {
    console.error(`❌ Failed to load ${prefix} routes from ${routePath}:`, error.message);
    
    // Create a fallback route that returns an error
    app.use(prefix, (req, res) => {
      res.status(503).json({
        error: "Service temporarily unavailable",
        message: `${prefix} routes failed to load`,
        timestamp: new Date().toISOString()
      });
    });
  }
};

// Load all route modules
const routes = [
  { path: "./routes/authRoutes", prefix: "/auth" },
  { path: "./routes/menuRoutes", prefix: "/menu" },
  { path: "./routes/orderRoutes", prefix: "/order" },
  { path: "./routes/predictionRoutes", prefix: "/predictions" }
];

routes.forEach(route => {
  safeRouteLoad(route.path, route.prefix);
});

// ================================
// 🔍 Enhanced Debug Routes
// ================================
app.get("/debug/routes", (req, res) => {
  const routes = [];
  const extractRoutes = (stack, prefix = "") => {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
        routes.push({ 
          method: methods, 
          path: prefix + layer.route.path,
          middleware: layer.route.stack.length
        });
      } else if (layer.name === "router" && layer.handle.stack) {
        const routerPrefix = layer.regexp.source.replace('\\', '').replace('(?=\\/|$)', '').replace('^', '');
        extractRoutes(layer.handle.stack, routerPrefix);
      }
    });
  };
  
  try {
    extractRoutes(app._router.stack);
    res.json({
      message: "🔍 Available API Routes",
      totalRoutes: routes.length,
      routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      serverInfo: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        uptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage()
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Route debug failed:', error);
    res.status(500).json({
      error: "Failed to generate routes list",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get("/debug/status", async (req, res) => {
  try {
    const User = require("./models/User");
    const MenuItem = require("./models/MenuItem");
    const Order = require("./models/Order");
    
    const [userCount, menuCount, orderCount] = await Promise.all([
      User.countDocuments(),
      MenuItem.countDocuments(),
      Order.countDocuments()
    ]);

    res.json({
      message: "🔍 System Status",
      database: {
        status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        collections: {
          users: userCount,
          menuItems: menuCount,
          orders: orderCount
        }
      },
      server: {
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Status check failed",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================================
// 📦 Serve Frontend (Production Only)
// ================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "client/build");
  
  // Check if build directory exists
  const fs = require("fs");
  if (fs.existsSync(buildPath)) {
    console.log("📦 Serving static files from:", buildPath);
    app.use(express.static(buildPath));
    
    // Handle React Router
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/auth/') || 
          req.path.startsWith('/menu/') || 
          req.path.startsWith('/order/') || 
          req.path.startsWith('/predictions/') ||
          req.path.startsWith('/health') ||
          req.path.startsWith('/debug/')) {
        return next();
      }
      
      res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
    });
  } else {
    console.warn("⚠️ Frontend build directory not found at:", buildPath);
  }
}

// ================================
// 🚫 Enhanced 404 Handler
// ================================
app.use((req, res) => {
  console.warn(`❌ 404 - Route not found: ${req.method} ${req.path} from ${req.ip}`);
  res.status(404).json({
    error: "404 Not Found",
    message: `Route '${req.method} ${req.path}' not found`,
    suggestion: "Check /debug/routes for available endpoints",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 💥 Enhanced Global Error Handler
// ================================
app.use((err, req, res, next) => {
  // Log the error
  console.error("💥 Global Error Handler:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  let statusCode = err.status || 500;
  let message = err.message || "Internal Server Error";

  // MongoDB errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = "Validation Error: " + Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate entry - record already exists";
  }

  // CORS errors
  if (err.message && err.message.includes('CORS policy')) {
    statusCode = 403;
    message = "CORS policy violation";
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
});

// ================================
// 🚀 Enhanced Server Startup
// ================================
const PORT = process.env.PORT || 5173;

const startServer = async (port) => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Seed admin user
    await seedAdminUser();
    
    const server = app.listen(port, () => {
      console.log('🎉=================================🎉');
      console.log(`✅ Server running on port ${port}`);
      console.log(`🌐 Local: http://localhost:${port}`);
      console.log(`🔍 Health: http://localhost:${port}/health`);
      console.log(`📋 Routes: http://localhost:${port}/debug/routes`);
      console.log(`🎯 Predictions: http://localhost:${port}/predictions/current`);
      console.log(`🛡️ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🎉=================================🎉');
    });

    // Enhanced graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          // Close database connection
          await mongoose.connection.close();
          console.log('✅ Database connection closed');
          
          // Stop cron jobs if they exist
          try {
            const predictionCron = require('./jobs/predictionCron');
            predictionCron.stopJobs();
            console.log('✅ Cron jobs stopped');
          } catch (cronError) {
            console.log('ℹ️ No cron jobs to stop');
          }
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
      process.on(signal, () => gracefulShutdown(signal));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// ================================
// 🔍 Port Availability Check
// ================================
const checkPortAvailability = (port) => {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use`);
          console.error('💡 Solutions:');
          console.error(`   1. Kill the process using: lsof -ti:${port} | xargs kill -9`);
          console.error(`   2. Use a different port: PORT=${port + 1} npm start`);
          console.error(`   3. Check if another instance is running`);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.close();
        resolve(port);
      })
      .listen(port);
  });
};

// ================================
// ⏰ Initialize Cron Jobs (After Server Start)
// ================================
const initializeCronJobs = () => {
  if (process.env.NODE_ENV === "test") {
    console.log('🧪 Skipping cron jobs in test environment');
    return;
  }

  setTimeout(() => {
    try {
      const predictionCron = require("./jobs/predictionCron");
      predictionCron.startJobs();
      console.log('⏰ Prediction cron jobs initialized successfully');
    } catch (error) {
      console.error("❌ Failed to initialize cron jobs:", error.message);
      console.error("💡 This might be due to missing dependencies or database connectivity issues");
    }
  }, 5000); // Wait 5 seconds for server to fully start
};

// ================================
// 🚀 Start the Application
// ================================
const main = async () => {
  try {
    console.log('🚀 Starting Hotel Ordering API Server...');
    console.log(`📅 Startup Time: ${new Date().toLocaleString()}`);
    console.log(`🔧 Node Version: ${process.version}`);
    console.log(`📂 Working Directory: ${process.cwd()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check port availability
    await checkPortAvailability(PORT);
    console.log(`✅ Port ${PORT} is available`);
    
    // Start server
    const server = await startServer(PORT);
    
    // Initialize cron jobs after server is running
    initializeCronJobs();
    
    // Log memory usage
    const memUsage = process.memoryUsage();
    console.log(`💾 Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap / ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
    
    return server;
  } catch (error) {
    console.error('💥 Application startup failed:', error.message);
    process.exit(1);
  }
};

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal startup error:', error);
    process.exit(1);
  });
}

module.exports = app;