import { Request } from "express";

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type UserRole = "customer" | "operator";

export type ShipmentStatus =
  | "pending"
  | "received"
  | "processing"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

export type DeliveryOption = "standard" | "express" | "economy";

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "pending",
  "received",
  "processing",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
];

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  "standard",
  "express",
  "economy",
];

export const USER_ROLES: UserRole[] = ["customer", "operator"];
