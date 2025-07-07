
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:  { type: String, trim: true, default: '' },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['admin', 'waiter'], 
      default: 'waiter',
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password.trim(), 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain.trim(), this.password);
};

module.exports = mongoose.model('User', userSchema);
