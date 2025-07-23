require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect to MongoDB
connectDB();

// 🌱 TEMPORARY ADMIN SEEDING
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
    } else {
      console.log('⚠️ Admin already exists');
    }
  } catch (err) {
    console.error('❌ Admin seeding error:', err.message);
  }
})();

const app = express();

// 🛡️ Global Middleware
app.use(helmet());
app.use(express.json());

// 🌐 CORS Configuration
const allowedOrigins = [
  'http://localhost:5173', // Dev
  'https://magical-alpaca-fa7f48.netlify.app' // Netlify frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS Not Allowed'));
    }
  },
  credentials: true
}));

// 🚫 Rate Limiting (15 minutes, 100 requests)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
}));

// 🚀 Routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.get('/', (_req, res) => {
  res.send('🚀 Hotel Ordering API running');
});

app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/order', orderRoutes);

// ❌ Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('💥', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

// 🔊 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
