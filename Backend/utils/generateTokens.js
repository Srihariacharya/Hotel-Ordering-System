const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET, // ✅ Fix: Correct env variable
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '7d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET, // ✅ Fix: Correct env variable
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );
};

const generateTokens = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

module.exports = generateTokens;