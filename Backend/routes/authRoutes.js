// routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const generateTokens = require('../utils/generateTokens');

// ---------------------------------------------------
// REGISTER a new user
// ---------------------------------------------------
router.post('/register', async (req, res) => {
  let { name, email, password } = req.body;

  // Clean and normalize input
  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check for existing user
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user (password is hashed in model)
    const user = await User.create({ name, email, password });

    // Generate JWTs
    const { accessToken, refreshToken } = generateTokens(user);

    // Send response
    return res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// ---------------------------------------------------
// LOGIN a user
// ---------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    // 🔍 Step 1: Clean input
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    console.log('🔐 Login attempt for:', email);

    // 🔒 Step 2: Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ No user found with email:', email);
      return res.status(400).json({ message: 'Invalid email' });
    }

    // 🔐 Step 3: Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Wrong password for email:', email);
      return res.status(400).json({ message: 'Wrong password' });
    }

    // ✅ Step 4: Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    console.log('✅ Login successful for:', user.name, '| Role:', user.role);

    // ✅ Step 5: Send response
    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });

  } catch (err) {
    console.error('🔥 Login error:', err.message);
    return res.status(500).json({ message: 'Server error during login' });
  }
});




// ---------------------------------------------------
// REFRESH ACCESS TOKEN
// ---------------------------------------------------
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Respond
    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
