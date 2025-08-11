// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (...roles) => async (req, res, next) => {
  try {
    // ✅ Ensure JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('❌ Missing JWT_SECRET in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization;

    // ✅ Check if Authorization header exists
    if (!authHeader) {
      console.warn('⚠️ No Authorization header provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // ✅ Check format: must start with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ Malformed Authorization header');
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT Decoded:', decoded);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.warn('⚠️ Token expired');
        return res.status(401).json({ error: 'Token expired' });
      }
      if (err.name === 'JsonWebTokenError') {
        console.warn('⚠️ Invalid token signature');
        return res.status(401).json({ error: 'Invalid token signature' });
      }
      console.error('❌ JWT verification error:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // ✅ Find user by ID from token
    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    if (!user) {
      console.warn('⚠️ User not found for token');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;

    // ✅ Role-based access control
    if (roles.length && !roles.includes(user.role)) {
      console.warn(`⚠️ Role "${user.role}" is not allowed`);
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    next();
  } catch (err) {
    console.error('💥 Unexpected auth error:', err.message);
    res.status(500).json({ error: 'Authentication middleware error' });
  }
};

module.exports = { protect };
