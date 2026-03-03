import { Response } from "express";
import Shipment from "../models/Shipment.js";
import type { AuthRequest, ShipmentStatus } from "../types/index.js";
import {
  generateTrackingNumber,
  computeEstimatedDelivery,
} from "../utils/trackingNumber.js";

const PAGE_SIZE = 20;

/**
 * POST /api/shipments
 * Customer only — create a new shipment.
 */
export async function createShipment(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { sender, recipient, cargo, deliveryOption } = req.body;

  const trackingNumber = await generateTrackingNumber();
  const estimatedDelivery = computeEstimatedDelivery(deliveryOption);

  const shipment = await Shipment.create({
    trackingNumber,
    customerId: req.user!.userId,
    sender,
    recipient,
    cargo,
    deliveryOption,
    estimatedDelivery,
    status: "pending",
    trackingHistory: [
      {
        status: "pending",
        note: "Shipment booked",
        timestamp: new Date(),
      },
    ],
  });

  res.status(201).json(shipment);
}

/**
 * GET /api/shipments
 * Protected, role-aware — list shipments with search, filter, and pagination.
 */
export async function listShipments(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { search, status, page } = req.query;
  const currentPage = Math.max(1, parseInt(page as string, 10) || 1);

  // Build query filter
  const filter: Record<string, unknown> = {};

  // Customers only see their own shipments
  if (req.user!.role === "customer") {
    filter.customerId = req.user!.userId;
  }

  // Status filter
  if (status && typeof status === "string") {
    filter.status = status;
  }

  // Search filter: matches trackingNumber or recipient.name
  if (search && typeof search === "string") {
    const regex = { $regex: search, $options: "i" };
    filter.$or = [{ trackingNumber: regex }, { "recipient.name": regex }];
  }

  const [shipments, total] = await Promise.all([
    Shipment.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Shipment.countDocuments(filter),
  ]);

  res.json({
    shipments,
    page: currentPage,
    totalPages: Math.ceil(total / PAGE_SIZE),
    total,
  });
}

/**
 * GET /api/shipments/:id
 * Protected — get shipment detail. Customers can only access their own.
 */
export async function getShipment(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const shipment = await Shipment.findById(req.params.id).populate(
    "customerId",
    "name email",
  );

  if (!shipment) {
    res.status(404).json({ error: "Shipment not found." });
    return;
  }

  // Customers can only see their own shipments
  if (
    req.user!.role === "customer" &&
    shipment.customerId._id.toString() !== req.user!.userId
  ) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  res.json(shipment);
}

/**
 * GET /api/shipments/track/:trackingNumber
 * Public — track a shipment by tracking number.
 */
export async function trackShipment(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const shipment = await Shipment.findOne({
    trackingNumber: req.params.trackingNumber,
  })
    .select(
      "trackingNumber status estimatedDelivery sender.address recipient.address trackingHistory deliveryOption",
    )
    .lean();

  if (!shipment) {
    res
      .status(404)
      .json({ error: "No shipment found for that tracking number." });
    return;
  }

  res.json(shipment);
}

/**
 * PATCH /api/shipments/:id/status
 * Operator only — update shipment status.
 */
export async function updateShipmentStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { status, note, location } = req.body;

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found." });
    return;
  }

  // Push new tracking entry
  shipment.trackingHistory.push({
    status: status as ShipmentStatus,
    note,
    location,
    timestamp: new Date(),
  });

  shipment.status = status as ShipmentStatus;
  await shipment.save();

  res.json(shipment);
}
