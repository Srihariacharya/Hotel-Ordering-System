// Backend/config/db.js (Create this if it doesn't exist)
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Test the connection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Available collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Don't exit in development, just warn
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing without MongoDB connection in development mode');
    }
  }
};

// Handle connection errors
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

module.exports = connectDB;