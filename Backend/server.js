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

// ================================
// 🔐 Validate Environment Variables
// ================================
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("❌ Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in .env");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

// ================================
// 📦 Connect to MongoDB
// ================================
connectDB();

// ================================
// 🏗 Express App Setup
// ================================
const app = express();

// ================================
// 🛡 Global Middleware
// ================================
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ================================
// 🌐 CORS Settings
// ================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://magical-alpaca-fa7f48.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow Postman/curl
      if (!allowedOrigins.includes(origin)) {
        return callback(new Error("Not allowed by CORS"), false);
      }
      return callback(null, true);
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
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: "Too many requests from this IP, please try again later.",
  })
);

// ================================
// 👨‍💻 Admin Seeding
// ================================
(async () => {
  try {
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
    }
  } catch (err) {
    console.error("❌ Admin seeding error:", err.message);
  }
})();

// ================================
// 🌍 Root + Health Routes
// ================================
app.get("/", (_req, res) => {
  res.json({
    message: "🚀 Hotel Ordering API with Smart Predictions",
    version: "2.0.0",
    features: ["Authentication", "Menu Management", "Order Processing", "AI Predictions"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (_req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.json({
      status: "healthy",
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ================================
// 📌 Safe Route Loader
// ================================
const safeRouteLoad = (path, prefix) => {
  try {
    const routes = require(path);
    app.use(prefix, routes);
    console.log(`✅ ${prefix} routes loaded`);
  } catch (error) {
    console.error(`❌ Failed to load ${prefix} routes:`, error.message);
  }
};

safeRouteLoad("./routes/authRoutes", "/auth");
safeRouteLoad("./routes/menuRoutes", "/menu");
safeRouteLoad("./routes/orderRoutes", "/order");
safeRouteLoad("./routes/predictionRoutes", "/predictions");

// ================================
// 🔍 Debug Route
// ================================
app.get("/debug/routes", (req, res) => {
  const routes = [];
  const extractRoutes = (stack, prefix = "") => {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        routes.push({ method: methods.join(", ").toUpperCase(), path: prefix + layer.route.path });
      } else if (layer.name === "router" && layer.handle.stack) {
        extractRoutes(layer.handle.stack, prefix);
      }
    });
  };
  extractRoutes(app._router.stack);
  res.json({
    message: "Available API routes",
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    count: routes.length,
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 📦 Serve Frontend (Production)
// ================================
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));
  app.get("*", (req, res) => {
    if (
      ["/api/", "/auth/", "/menu/", "/order/", "/predictions/"].some((prefix) =>
        req.path.startsWith(prefix)
      )
    ) {
      return res.status(404).json({ error: "404 Not Found" });
    }
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

// ================================
// 🚫 404 Handler
// ================================
app.use((req, res) => {
  res.status(404).json({
    error: "404 Not Found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 💥 Global Error Handler
// ================================
app.use((err, req, res, _next) => {
  console.error("💥 Global Error:", err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Server Error",
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 🚀 Start Server with Port Check
// ================================
const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Debug routes: http://localhost:${port}/debug/routes`);
    console.log(`🎯 Predictions: http://localhost:${port}/predictions/current`);
  });

  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.on(signal, () => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });
  });
};

// Check port availability
const tester = net.createServer()
  .once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Kill existing process or change PORT.`);
      process.exit(1);
    }
  })
  .once("listening", () => {
    tester.close();
    startServer(PORT);
  })
  .listen(PORT);

// ================================
// ⏰ Start Cron Jobs (Prediction)
// ================================
if (process.env.NODE_ENV !== "test") {
  setTimeout(() => {
    try {
      require("./jobs/predictionCron");
      console.log("⏰ Prediction cron jobs started");
    } catch (error) {
      console.error("❌ Cron job initialization failed:", error.message);
    }
  }, 5000);
}

module.exports = app;
