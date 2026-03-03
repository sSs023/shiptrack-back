import { body, query } from "express-validator";
import { SHIPMENT_STATUSES, DELIVERY_OPTIONS } from "../types/index.js";

export const createShipmentValidator = [
  body("sender.name").trim().notEmpty().withMessage("Sender name is required."),
  body("sender.address")
    .trim()
    .notEmpty()
    .withMessage("Sender address is required."),
  body("sender.phone")
    .trim()
    .notEmpty()
    .withMessage("Sender phone is required."),

  body("recipient.name")
    .trim()
    .notEmpty()
    .withMessage("Recipient name is required."),
  body("recipient.address")
    .trim()
    .notEmpty()
    .withMessage("Recipient address is required."),
  body("recipient.phone")
    .trim()
    .notEmpty()
    .withMessage("Recipient phone is required."),

  body("cargo.description")
    .trim()
    .notEmpty()
    .withMessage("Cargo description is required."),
  body("cargo.weight")
    .isFloat({ min: 0.01 })
    .withMessage("Cargo weight must be a positive number."),
  body("cargo.dimensions")
    .trim()
    .notEmpty()
    .withMessage("Cargo dimensions are required."),

  body("deliveryOption")
    .isIn(DELIVERY_OPTIONS)
    .withMessage(
      `Delivery option must be one of: ${DELIVERY_OPTIONS.join(", ")}.`,
    ),
];

export const updateStatusValidator = [
  body("status")
    .isIn(SHIPMENT_STATUSES)
    .withMessage(`Status must be one of: ${SHIPMENT_STATUSES.join(", ")}.`),
  body("note").optional().trim(),
  body("location").optional().trim(),
];

export const listShipmentsValidator = [
  query("search").optional().trim(),
  query("status")
    .optional()
    .isIn(SHIPMENT_STATUSES)
    .withMessage(
      `Status filter must be one of: ${SHIPMENT_STATUSES.join(", ")}.`,
    ),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
];
