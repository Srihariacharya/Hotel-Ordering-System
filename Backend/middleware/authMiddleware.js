const jwt = require('jsonwebtoken');
const User = require('../models/User');


const protect = (...roles) => async (req, res, next) => {
  try {
    /* 1️⃣ get the token */
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    /* 2️⃣ verify & decode */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* 3️⃣ attach user (minus password) */
    req.user = await User.findById(decoded.userId).select('-password');
    console.log('ROLE in protect:', req.user.role);
    if (!req.user) return res.status(401).json({ error: 'User not found' });

    /* 4️⃣ role check (if roles specified) */
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next(); // ✅ everything ok
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { protect };