require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const path = require('path');
const predictionRoutes = require('./routes/predictionRoutes');

const connectDB = require('./config/db');
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

// ===== Validate Environment Variables =====
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error('❌ Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in .env');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('❌ Missing MONGO_URI in .env');
  process.exit(1);
}

// ===== Connect to MongoDB =====
connectDB();

const app = express();

// ===== Global Middleware =====
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/predictions', predictionRoutes);

// ===== CORS Settings =====
const allowedOrigins = [
  'http://localhost:5173',
  'https://magical-alpaca-fa7f48.netlify.app' // frontend on Netlify
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow Postman/curl
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===== Rate Limiting =====
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'Too many requests from this IP, please try again later.',
}));

// ===== Admin Seeding =====
(async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('✅ Default admin created: admin@example.com / admin123');
    }
  } catch (err) {
    console.error('❌ Admin seeding error:', err.message);
  }
})();

// ===== Cleanup Double-Hashed Users =====
(async () => {
  try {
    const users = await User.find({ email: { $ne: 'admin@example.com' } });
    for (const user of users) {
      if (user.password && user.password.length > 100) {
        console.log('🗑️ Removing possibly corrupted user:', user.email);
        await User.findByIdAndDelete(user._id);
      }
    }
  } catch (err) {
    console.error('❌ User cleanup error:', err.message);
  }
})();

// ===== Root Route =====
app.get('/', (_req, res) => {
  res.send('🚀 Hotel Ordering API running');
});

// ===== API Routes =====
app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/order', orderRoutes);

// ===== Serve Frontend (optional if you want Netlify separate) =====
// If you ever want to serve React build from backend:
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: '404 Not Found' });
});

// ===== Global Error Handler =====
app.use((err, _req, res, _next) => {
  console.error('💥 Error:', err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Start cron jobs (add before server.listen())
if (process.env.NODE_ENV !== 'test') {
  require('./jobs/predictionCron');
}