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

// ✅ TEMPORARY ADMIN SEEDING
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

// 🌐 CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://magical-alpaca-fa7f48.netlify.app'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🚫 Rate Limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
}));

// ✅ Basic Home Route
app.get('/', (_req, res) => {
  res.send('🚀 Hotel Ordering API running');
});
app.use('/api/auth', require('./routes/authRoutes'));
// ✅ Register route
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    });

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error('💥 Registration Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

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
