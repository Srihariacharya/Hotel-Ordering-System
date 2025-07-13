// utils/generateTokens.js

const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token (used for API access)
 * @param {Object} user - User object (Mongoose document)
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a long-lived refresh token (used to get new access tokens)
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Returns both access and refresh tokens
 * @param {Object} user - User object
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

module.exports = generateTokens;
