import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/shiptrack",
  JWT_SECRET: process.env.JWT_SECRET || "fallback-secret-do-not-use-in-prod",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;
