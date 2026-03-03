import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import shipmentRoutes from "./routes/shipment.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// ---------------- Express settings ---------------
app.set("trust proxy", 1);

// --------------- Security middleware ---------------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Rate limiting — 100 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  }),
);

// --------------- Body parsing ---------------
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// --------------- Health check ---------------
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "ShipTrack API" });
});

// --------------- API Routes ---------------
app.use("/api/auth", authRoutes);
app.use("/api/shipments", shipmentRoutes);

// --------------- 404 handler ---------------
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// --------------- Global error handler ---------------
app.use(errorHandler);

export default app;
