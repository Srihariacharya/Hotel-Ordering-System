const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');

connectDB();

const app = express();

app.use(helmet());

app.use(cors({ origin: '*', credentials: true }));


app.use(cors({
  origin: 'http://localhost:5173', // React's dev server
  credentials: true               // If sending cookies/token
}));


app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,             
  })
);

app.use(express.json());

const menuRoutes  = require('./routes/menuRoutes');
const authRoutes  = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.get('/', (req, res) => res.send('Hotel Ordering API is running 🚀'));
app.use('/menu',  menuRoutes);
app.use('/auth',  authRoutes);
app.use('/order', orderRoutes);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
