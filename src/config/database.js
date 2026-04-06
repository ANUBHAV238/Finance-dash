const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      // Mongoose 8.x uses these by default, explicit for clarity
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Graceful disconnect
const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('MongoDB disconnected');
};

module.exports = { connectDB, disconnectDB };
