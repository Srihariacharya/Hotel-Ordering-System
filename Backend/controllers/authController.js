// controllers/authController.js
const User   = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

/* --------------------------------------------------------------
   POST /auth/register  – create a new user
----------------------------------------------------------------*/
exports.registerUser = async (req, res) => {
  try {
    let { name = '', email = '', password = '' } = req.body;

    // Normalise inputs
    email    = email.trim().toLowerCase();
    password = password.trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check for duplicates
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user – pre‑save hook hashes password
    const user = await User.create({
      name: name.trim(),
      email,
      password,
      role: 'customer',            // change if you need another default
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* --------------------------------------------------------------
   POST /auth/login  – authenticate user
----------------------------------------------------------------*/
exports.loginUser = async (req, res) => {
  try {
    let { email = '', password = '' } = req.body;
    email    = email.trim().toLowerCase();
    password = password.trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If you added userSchema.methods.comparePassword, you can call it here
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
