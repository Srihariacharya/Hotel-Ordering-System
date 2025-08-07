// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateTokens');

// --------------------------------------------------------------
// POST /auth/register – create a new user
// --------------------------------------------------------------
exports.registerUser = async (req, res) => {
  try {
    let { name = '', email = '', password = '' } = req.body;

    // Normalize input
    email = email.trim().toLowerCase();
    password = password.trim();
    name = name.trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: 'customer', // Default role
    });

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Respond with tokens and user info
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --------------------------------------------------------------
// POST /auth/login – authenticate user
// --------------------------------------------------------------
exports.loginUser = async (req, res) => {
  try {
    let { email = '', password = '' } = req.body;
    email = email.trim().toLowerCase();
    password = password.trim();

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Respond with tokens and user info
    res.json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
