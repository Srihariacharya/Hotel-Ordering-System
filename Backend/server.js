require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
connectDB();

// ✅ TEMPORARY ADMIN SEED
const bcrypt = require('bcryptjs');
const User = require('./models/User');
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

/* -------------------------------------------------
   3. Global middleware
------------------------------------------------- */
app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        return cb(null, true);           // allow all localhost ports
      }
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 mins
    max: 100                    // 100 requests per window
  })
);

/* -------------------------------------------------
   4. Routes
------------------------------------------------- */
const authRoutes   = require('./routes/authRoutes');
const menuRoutes   = require('./routes/menuRoutes');
const orderRoutes  = require('./routes/orderRoutes');

app.get('/', (_req, res) => res.send('🚀 Hotel Ordering API running'));

app.use('/auth',  authRoutes);
app.use('/menu',  menuRoutes);
app.use('/order', orderRoutes);

/* -------------------------------------------------
   5. Error handler
------------------------------------------------- */
app.use((err, _req, res, _next) => {
  console.error('💥', err);
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Server error' });
});

/* -------------------------------------------------
   6. Start server
------------------------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server is running on http://localhost:${PORT}`)
);
