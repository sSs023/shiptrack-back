import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

/**
 * Connect to an in-memory MongoDB instance for testing.
 */
export async function setupTestDB(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop all collections (reset state between tests).
 */
export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnect and stop the in-memory MongoDB instance.
 */
export async function teardownTestDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
