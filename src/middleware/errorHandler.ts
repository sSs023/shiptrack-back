import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error & { statusCode?: number; code?: number | string },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("Unhandled error:", err);

  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.code === 11000) {
    res
      .status(409)
      .json({ error: "Duplicate key error. Resource already exists." });
    return;
  }

  if (err.name === "CastError") {
    res.status(400).json({ error: "Invalid resource ID format." });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error." : err.message;

  res.status(statusCode).json({ error: message });
}
