// backend/utils/jwt.js

const jwt = require('jsonwebtoken');

// Function to generate JWT token for 7 days
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin || false,
    },
    process.env.JWT_SECRET, // JWT_SECRET should be in your .env file
    {
      expiresIn: '7d', // 7 days token expiry
    }
  );
};

// Function to verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
