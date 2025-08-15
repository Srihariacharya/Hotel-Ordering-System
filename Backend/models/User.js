// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name required'], 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email required'], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password required'], 
    minlength: 6 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  }
}, { 
  timestamps: true 
});

// Virtual property for isAdmin
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// ✅ CRITICAL: Hash password before saving (only if password is modified)
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    console.log('🔒 Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('🔒 Hashing password for user:', this.email);
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (err) {
    console.error('❌ Password hashing failed:', err);
    next(err);
  }
});

// ✅ Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    console.log('🔍 Comparing password for user:', this.email);
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('🔍 Password comparison result:', isMatch ? '✅ Match' : '❌ No match');
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// Ensure virtual fields are included in JSON output
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password; // Never send password in JSON
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);