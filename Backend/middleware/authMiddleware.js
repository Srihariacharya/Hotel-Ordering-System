const jwt = require('jsonwebtoken');
const User = require('../models/User');


const protect = (...roles) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.userId).select('-password');
    console.log('ROLE in protect:', req.user.role);
    if (!req.user) return res.status(401).json({ error: 'User not found' });

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next(); 
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { protect };