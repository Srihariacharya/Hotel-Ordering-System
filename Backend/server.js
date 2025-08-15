require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes'); // optional

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
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form-data bodies

// ===== CORS Settings =====
const allowedOrigins = [
  'http://localhost:5173', // local dev frontend
  'https://magical-alpaca-fa7f48.netlify.app' // production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow Postman/curl with no origin
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

// ===== Admin Seeding (run once) =====
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

// ===== Temporary Cleanup for Double-Hashed Users =====
(async () => {
  try {
    console.log('🧹 Checking for double-hashed user passwords...');
    const users = await User.find({ email: { $ne: 'admin@example.com' } });

    for (const user of users) {
      if (user.password && user.password.length > 100) {
        console.log('🗑️ Removing possibly corrupted user:', user.email);
        await User.findByIdAndDelete(user._id);
      }
    }
    console.log('✅ User cleanup completed');
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

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: '404 Not Found' });
});

// ===== Global Error Handler =====
app.use((err, _req, res, _next) => {
  console.error('💥 Error:', err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

// ===== Verify Secrets Loaded =====
console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET ? 'Loaded' : 'Missing');
console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET ? 'Loaded' : 'Missing');

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
