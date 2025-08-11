// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    let { name = '', email = '', password = '' } = req.body;
    name = name.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: 'user' });

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // 4. Send tokens and user data (excluding password)
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    if (!process.env.REFRESH_TOKEN_SECRET) {
      console.error('Missing REFRESH_TOKEN_SECRET');
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const { accessToken, refreshToken: newRefresh } = generateTokens(user);

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken: newRefresh
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
