// utils/jwt.js
const jwt = require('jsonwebtoken');

const assertSecrets = () => {
  // ✅ CRITICAL FIX: Use consistent secret names
  if (!process.env.JWT_SECRET && !process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('JWT_SECRET or ACCESS_TOKEN_SECRET must be set in environment');
  }
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not set in environment');
  }
};

const generateTokens = (user) => {
  if (!user || !user._id) throw new Error('User object with _id required');

  assertSecrets();

  // ✅ CRITICAL FIX: Use JWT_SECRET primarily, fallback to ACCESS_TOKEN_SECRET
  const accessSecret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;

  console.log('🔐 Generating tokens for user:', user._id);
  console.log('🔑 Using access secret:', accessSecret ? 'Present' : 'Missing');

  const accessToken = jwt.sign(
    { 
      id: user._id.toString(), 
      userId: user._id.toString(), // ✅ Add both id and userId for compatibility
      role: user.role || 'user',
      email: user.email
    },
    accessSecret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: user._id.toString() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d' }
  );

  console.log('✅ Tokens generated successfully');

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };