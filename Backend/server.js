require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const path = require("path");

const connectDB = require("./config/db");
const User = require("./models/User");

// ===== Import Routes =====
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// ===== Security & Body Parsers =====
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== CORS Config =====
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://magical-alpaca-fa7f48.netlify.app", // Netlify frontend
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.includes("railway.app")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===== Rate Limiting =====
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // limit per IP
    message: "Too many requests from this IP, please try again later.",
  })
);

// ===== Connect to MongoDB & Seed Admin =====
connectDB().then(async () => {
  try {
    // Admin Seeding
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
      console.log("⚠️ Admin already exists");
    }

    // Cleanup corrupted users
    const users = await User.find({ email: { $ne: "admin@example.com" } });
    for (const user of users) {
      if (user.password && user.password.length > 100) {
        console.log("🗑️ Removing possibly corrupted user:", user.email);
        await User.findByIdAndDelete(user._id);
      }
    }
  } catch (err) {
    console.error("❌ Seeding/Cleanup error:", err.message);
  }
});

// ===== Health Check (for Railway) =====
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ===== Root Route =====
app.get("/", (_req, res) => {
  res.send("🚀 Hotel Ordering API running");
});

// ===== API Routes =====
app.use("/auth", authRoutes);
app.use("/menu", menuRoutes);
app.use("/order", orderRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: "404 Not Found" });
});

// ===== Global Error Handler =====
app.use((err, _req, res, _next) => {
  console.error("💥 Error:", err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || "Server Error" });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
