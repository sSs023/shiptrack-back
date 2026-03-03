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

/**
 * @swagger
 * tags:
 *   - name: Shipments
 *     description: Shipment CRUD & tracking
 */

/**
 * @swagger
 * /shipments/track/{trackingNumber}:
 *   get:
 *     tags: [Shipments]
 *     summary: Track a shipment (public)
 *     description: Returns tracking details for a shipment by its tracking number. No authentication required.
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The shipment tracking number
 *         example: ST-20260303-A1B2C3
 *     responses:
 *       200:
 *         description: Tracking information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackingResponse'
 *       404:
 *         description: No shipment found for that tracking number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/track/:trackingNumber", trackShipment);

/**
 * @swagger
 * /shipments:
 *   post:
 *     tags: [Shipments]
 *     summary: Create a new shipment
 *     description: Creates a new shipment. Only accessible by users with the **customer** role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShipmentRequest'
 *     responses:
 *       201:
 *         description: Shipment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shipment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — only customers can create shipments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post(
  "/",
  authenticate,
  requireRole("customer"),
  createShipmentValidator,
  validate,
  createShipment,
);

/**
 * @swagger
 * /shipments:
 *   get:
 *     tags: [Shipments]
 *     summary: List shipments
 *     description: |
 *       Returns a paginated list of shipments with optional search and status filters.
 *       - **Customers** see only their own shipments.
 *       - **Operators** see all shipments.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by tracking number or recipient name (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, received, processing, in_transit, out_for_delivery, delivered, failed]
 *         description: Filter by shipment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (20 items per page)
 *     responses:
 *       200:
 *         description: Paginated list of shipments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShipmentListResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get("/", authenticate, listShipmentsValidator, validate, listShipments);

/**
 * @swagger
 * /shipments/{id}:
 *   get:
 *     tags: [Shipments]
 *     summary: Get shipment by ID
 *     description: |
 *       Returns full shipment details including populated customer info.
 *       - **Customers** can only access their own shipments.
 *       - **Operators** can access any shipment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the shipment
 *         example: 664f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Shipment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shipment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied — customers can only view their own shipments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shipment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticate, getShipment);

/**
 * @swagger
 * /shipments/{id}/status:
 *   patch:
 *     tags: [Shipments]
 *     summary: Update shipment status
 *     description: Updates the status of a shipment and adds a tracking history entry. Only accessible by users with the **operator** role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the shipment
 *         example: 664f1a2b3c4d5e6f7a8b9c0d
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Shipment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shipment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — only operators can update status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shipment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("operator"),
  updateStatusValidator,
  validate,
  updateShipmentStatus,
);

export default router;
