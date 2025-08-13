const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // ✅ CRITICAL FIX: Use consistent secret checking
      const jwtSecret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ Missing JWT_SECRET/ACCESS_TOKEN_SECRET in environment');
        return res.status(500).json({ 
          error: 'Server configuration error',
          message: 'Authentication service unavailable' 
        });
      }

      console.log('🔍 Auth middleware - checking secrets:', {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasAccessSecret: !!process.env.ACCESS_TOKEN_SECRET,
        usingSecret: jwtSecret ? 'Present' : 'Missing'
      });

      const authHeader = req.headers.authorization;
      console.log('🔍 Auth header received:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'Missing');

      if (!authHeader) {
        return res.status(401).json({ 
          error: 'Access denied', 
          message: 'No authorization header provided' 
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Access denied', 
          message: 'Invalid authorization header format' 
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ 
          error: 'Access denied', 
          message: 'No token provided' 
        });
      }

      // ✅ CRITICAL FIX: Use the same secret for verification
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
        console.log('✅ Token verified successfully:', {
          userId: decoded.id || decoded.userId,
          role: decoded.role,
          exp: new Date(decoded.exp * 1000).toISOString()
        });
      } catch (jwtError) {
        console.error('❌ JWT verification failed:', {
          error: jwtError.name,
          message: jwtError.message,
          token: token.substring(0, 20) + '...',
        });
        
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: 'Token expired', 
            message: 'Please log in again' 
          });
        }
        
        return res.status(401).json({ 
          error: 'Invalid token', 
          message: 'Authentication failed - token verification failed' 
        });
      }

      // ✅ Find user with both id and userId for compatibility
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        console.error('❌ No user ID in token:', decoded);
        return res.status(401).json({ 
          error: 'Invalid token', 
          message: 'Token does not contain user ID' 
        });
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        console.warn('⚠️ User not found for ID:', userId);
        return res.status(401).json({ 
          error: 'User not found', 
          message: 'Invalid authentication credentials' 
        });
      }

      console.log('👤 User authenticated successfully:', {
        id: user._id,
        name: user.name,
        role: user.role
      });

      req.user = user;

      // Check role permissions
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.warn(`⚠️ Role "${user.role}" not in allowed roles:`, allowedRoles);
        return res.status(403).json({ 
          error: 'Access forbidden', 
          message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}` 
        });
      }

      next();

    } catch (error) {
      console.error('💥 Unexpected auth middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Authentication service error' 
      });
    }
  };
};

module.exports = { protect };