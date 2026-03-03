import { Router } from "express";
import {
  createShipment,
  listShipments,
  getShipment,
  trackShipment,
  updateShipmentStatus,
} from "../controllers/shipment.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { validate } from "../middleware/validate.js";
import {
  createShipmentValidator,
  updateStatusValidator,
  listShipmentsValidator,
} from "../validators/shipment.validator.js";

const router = Router();

// Public route — track by tracking number (must be before /:id to avoid conflict)
router.get("/track/:trackingNumber", trackShipment);

// Protected routes
router.post(
  "/",
  authenticate,
  requireRole("customer"),
  createShipmentValidator,
  validate,
  createShipment,
);

router.get("/", authenticate, listShipmentsValidator, validate, listShipments);

router.get("/:id", authenticate, getShipment);

router.patch(
  "/:id/status",
  authenticate,
  requireRole("operator"),
  updateStatusValidator,
  validate,
  updateShipmentStatus,
);

export default router;
