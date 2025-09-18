const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');

const router = express.Router();

// ✅ FIXED Register Route - Remove manual hashing
router.post('/register', async (req, res) => {
  try {
    let { name = '', email = '', password = '' } = req.body;
    name = name.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    console.log('📝 Registration attempt:', { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.warn('⚠️ Email already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ CRITICAL FIX: Let the User model handle password hashing
    // Don't hash password here - the User model's pre('save') will do it
    const user = await User.create({
      name,
      email,
      password, // Raw password - let model hash it
      role: 'user'
    });

    console.log('✅ User created:', user._id);

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ✅ FIXED Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.warn('⚠️ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('👤 User found:', { id: user._id, name: user.name, role: user.role });

    // ✅ Use the User model's comparePassword method
    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) {
      console.warn('⚠️ Password mismatch for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ✅ Generate tokens using fixed utility
    const { accessToken, refreshToken } = generateTokens(user);

    console.log('✅ Login successful for:', email);
    console.log('🎫 Tokens generated:', {
      accessToken: accessToken.substring(0, 20) + '...',
      refreshToken: refreshToken.substring(0, 20) + '...'
    });

    // Return tokens and user data
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
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ✅ FIXED Refresh Route
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    console.log('🔄 Token refresh attempt');

    if (!process.env.REFRESH_TOKEN_SECRET) {
      console.error('❌ Missing REFRESH_TOKEN_SECRET');
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      console.warn('⚠️ Invalid refresh token:', err.message);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.warn('⚠️ User not found for refresh token');
      return res.status(401).json({ message: 'User not found' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user);

    console.log('✅ Tokens refreshed for:', user.email);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken: newRefresh
    });
  } catch (err) {
    console.error('❌ Refresh error:', err);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
});

module.exports = router;