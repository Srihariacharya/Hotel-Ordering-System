// utils/jwt.js
const jwt = require('jsonwebtoken');

const assertSecrets = () => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET is not set in environment');
  }
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not set in environment');
  }
};

const generateTokens = (user) => {
  if (!user || !user._id) throw new Error('User object with _id required');

  assertSecrets();

  const accessToken = jwt.sign(
    { id: user._id.toString(), role: user.role || 'user' },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id.toString() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
