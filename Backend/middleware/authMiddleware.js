const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (...roles) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🪪 Token decoded:', decoded);

    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;

    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { protect };
