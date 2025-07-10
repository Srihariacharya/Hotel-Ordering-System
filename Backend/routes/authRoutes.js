const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const router   = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
    let { name,email, password } = req.body;
     email    = email.trim().toLowerCase();
    password = password.trim(); 
    console.log('📡 Mongo host in /register:', mongoose.connection.host);

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,

    });

    const token = jwt.sign(
  { userId: user._id, role: user.role },   // <-- use userId key
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login request:', { email, password });
  console.log('📡 Mongo host in /login   :', mongoose.connection.host);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Email not found in DB');
      return res.status(400).json({ message: 'Email not found' });
    }

    console.log('✅ Found user:', user);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔍 Comparing passwords:', {
      plain: password,
      hashed: user.password,
      isMatch
    });

    if (!isMatch) {
      return res.status(400).json({ message: 'Wrong password' });
    }
const token = jwt.sign(
  { userId: user._id, role: user.role },   // <-- use userId key
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

    return res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router; 
