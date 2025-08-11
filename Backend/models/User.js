// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name required'], trim: true },
  email: { type: String, required: [true, 'Email required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password required'], minlength: 6 },
  role: { type: String, enum: ['user','admin'], default: 'user' }
}, { timestamps: true });

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
