require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db'); // your DB connection module
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Import routes (make sure these files exist)
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes'); // optional

// Validate required environment variables
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error('❌ Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in .env');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('❌ Missing MONGO_URI in .env');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = express();

// Global Middleware
app.use(helmet());
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',                // your frontend dev port
  'https://magical-alpaca-fa7f48.netlify.app'  // production frontend, for example
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin like Postman or curl
    if (!origin) return callback(null, true);

    if (!allowedOrigins.includes(origin)) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  credentials: true, // allow cookies, authorization headers with credentials
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  message: 'Too many requests from this IP, please try again later.',
}));

// Temporary admin seeding (run once at startup)
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

// Basic root route
app.get('/', (_req, res) => {
  res.send('🚀 Hotel Ordering API running');
});

// Mount routes
app.use('/auth', authRoutes);    // e.g. POST /auth/login, /auth/register, /auth/refresh
app.use('/menu', menuRoutes);    // e.g. GET /menu
app.use('/order', orderRoutes);  // if implemented

// 404 fallback for unknown routes
app.use((req, res) => {
  res.status(404).send('404 Not Found — requested resource could not be found.');
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('💥', err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

// Log secrets to verify env variables (remove in production)
console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET ? 'Loaded' : 'Missing');
console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET ? 'Loaded' : 'Missing');

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
