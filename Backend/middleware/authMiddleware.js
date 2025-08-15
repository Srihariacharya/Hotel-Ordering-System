// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // ✅ Use the same secret you used in login route when signing tokens
      const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
      if (!jwtSecret) {
        console.error('❌ Missing ACCESS_TOKEN_SECRET in environment');
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Authentication service unavailable'
        });
      }

      // ✅ Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authorization header missing or invalid'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'No token provided'
        });
      }

      // ✅ Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expired',
            message: 'Please log in again'
          });
        }
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token verification failed'
        });
      }

      // ✅ Find the user from token payload
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token does not contain a valid user ID'
        });
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'Invalid authentication credentials'
        });
      }

      // ✅ Attach user to request
      req.user = user;

      // ✅ Role-based access check
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'Access forbidden',
          message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('💥 Auth middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication service error'
      });
    }
  };
};

module.exports = { protect };
