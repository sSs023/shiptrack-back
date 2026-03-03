import { Response, NextFunction } from "express";
import type { AuthRequest, UserRole } from "../types/index.js";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden. Insufficient permissions." });
      return;
    }

    next();
  };
}
