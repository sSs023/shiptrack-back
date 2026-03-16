import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI!;

// Module-level cache (persists across requests in the same instance)
let isConnected = false;

const connectDB = async (): Promise<void> => {
  // Already connected in this instance
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // Connection exists but not yet open (connecting state)
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve, reject) => {
      mongoose.connection.once("connected", resolve);
      mongoose.connection.once("error", reject);
    });
    isConnected = true;
    return;
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      maxPoolSize: 10, // Reuse connections within the pool
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    isConnected = false;
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
