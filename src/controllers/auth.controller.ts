import { Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import type { AuthRequest } from "../types/index.js";

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: "7d" });
}

/**
 * POST /api/auth/register
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({ error: "Email already registered." });
    return;
  }

  const user = await User.create({ name, email, password, role });
  const token = signToken(user._id.toString(), user.role);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

/**
 * POST /api/auth/login
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  // Find user and explicitly select password field
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signToken(user._id.toString(), user.role);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
}
