require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

// ================================
// 🔐 Validate Environment Variables
// ================================
["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "MONGO_URI"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing ${key} in .env`);
    process.exit(1);
  }
});

// ================================
// 📦 Connect to MongoDB
// ================================
connectDB();

// ================================
// 🛡 Initialize Express App
// ================================
const app = express();
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
      if (!allowedOrigins.includes(origin)) return callback(new Error("Not allowed by CORS"), false);
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
    version: "2.0.1",
    features: ["Authentication", "Menu Management", "Order Processing", "AI Predictions"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "healthy",
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 📌 Load Routes Dynamically
// ================================
const loadRoutes = (routes) => {
  routes.forEach(({ path, prefix }) => {
    try {
      const routeModule = require(path);
      app.use(prefix, routeModule);
      console.log(`✅ ${prefix} routes loaded`);
    } catch (err) {
      console.error(`❌ Failed to load ${prefix} routes:`, err.message);
    }
  });
};

loadRoutes([
  { path: "./routes/authRoutes", prefix: "/auth" },
  { path: "./routes/menuRoutes", prefix: "/menu" },
  { path: "./routes/orderRoutes", prefix: "/order" },
  { path: "./routes/predictionRoutes", prefix: "/predictions" },
]);

// ================================
// 🔍 Debug Route
// ================================
app.get("/debug/routes", (req, res) => {
  const routes = [];
  const extractRoutes = (stack, prefix = "") => {
    stack.forEach((layer) => {
      if (layer.route) {
        routes.push({ method: Object.keys(layer.route.methods).join(", ").toUpperCase(), path: prefix + layer.route.path });
      } else if (layer.name === "router" && layer.handle.stack) {
        extractRoutes(layer.handle.stack, prefix);
      }
    });
  };
  extractRoutes(app._router.stack);
  res.json({ message: "Available API routes", routes, count: routes.length, timestamp: new Date().toISOString() });
});

// ================================
// 📦 Serve Frontend in Production
// ================================
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));
  app.get("*", (req, res) => {
    const apiPrefixes = ["/api/", "/auth/", "/menu/", "/order/", "/predictions/"];
    if (apiPrefixes.some((p) => req.path.startsWith(p))) return res.status(404).json({ error: "404 Not Found" });
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
  console.error("💥 Global Error:", { message: err.message, stack: err.stack, url: req.url, method: req.method });
  res.status(err.status || 500).json({
    error: err.message || "Server Error",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ================================
// 🚀 Start Server
// ================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Debug routes: http://localhost:${PORT}/debug/routes`);
});

// ================================
// ⏰ Load Cron Jobs
// ================================
if (process.env.NODE_ENV !== "test") {
  setTimeout(() => {
    try {
      require("./jobs/predictionCron");
      console.log("⏰ Prediction cron jobs started");
    } catch (err) {
      console.error("❌ Cron job initialization failed:", err.message);
    }
  }, 5000);
}

// ================================
// 🛑 Graceful Shutdown
// ================================
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`🛑 ${signal} received, shutting down gracefully`);
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });
});

module.exports = app;
