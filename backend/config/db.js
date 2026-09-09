const mongoose = require('mongoose');

let isConnected = false;
let memoryServerInstance = null;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/health_safe';

  try {
    console.log(`[MongoDB] Attempting connection to: ${mongoUri}`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}/${conn.connection.name}`);
    
    // Auto-seed if needed
    const { seedDatabase } = require('../seeds/doctorSeeds');
    const { seedAuthorities } = require('../seeds/authoritySeeds');
    const { seedComplaints } = require('../seeds/complaintSeeds');
    await seedDatabase();
    await seedAuthorities();
    await seedComplaints();
  } catch (error) {
    console.warn(`[MongoDB] Primary connection failed: ${error.message}`);
    console.log('[MongoDB] Initializing embedded in-memory MongoDB fallback...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const fallbackUri = memoryServerInstance.getUri();

      console.log(`[MongoDB] In-memory database started at: ${fallbackUri}`);
      await mongoose.connect(fallbackUri);

      isConnected = true;
      console.log('[MongoDB] Connected to in-memory fallback database successfully.');

      // Auto-seed in-memory database
      const { seedDatabase } = require('../seeds/doctorSeeds');
      const { seedAuthorities } = require('../seeds/authoritySeeds');
      const { seedComplaints } = require('../seeds/complaintSeeds');
      await seedDatabase();
      await seedAuthorities();
      await seedComplaints();
    } catch (fallbackError) {
      console.error(`[MongoDB] In-memory fallback failed: ${fallbackError.message}`);
    }
  }
};

const getDBStatus = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || (memoryServerInstance ? 'embedded-memory-server' : null),
    name: mongoose.connection.name || null,
    isInMemory: !!memoryServerInstance,
  };
};

module.exports = { connectDB, getDBStatus };
