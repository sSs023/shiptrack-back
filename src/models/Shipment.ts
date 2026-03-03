import mongoose, { Schema, Document } from "mongoose";
import type { ShipmentStatus, DeliveryOption } from "../types/index.js";

export interface ITrackingEntry {
  status: ShipmentStatus;
  timestamp: Date;
  note?: string;
  location?: string;
}

export interface IContactInfo {
  name: string;
  address: string;
  phone: string;
}

export interface ICargo {
  description: string;
  weight: number;
  dimensions: string;
}

export interface IShipment extends Document {
  _id: mongoose.Types.ObjectId;
  trackingNumber: string;
  customerId: mongoose.Types.ObjectId;
  sender: IContactInfo;
  recipient: IContactInfo;
  cargo: ICargo;
  deliveryOption: DeliveryOption;
  status: ShipmentStatus;
  estimatedDelivery: Date;
  trackingHistory: ITrackingEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const trackingEntrySchema = new Schema<ITrackingEntry>(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "received",
        "processing",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: { type: String },
    location: { type: String },
  },
  { _id: false },
);

const contactInfoSchema = new Schema<IContactInfo>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const cargoSchema = new Schema<ICargo>(
  {
    description: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    dimensions: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const shipmentSchema = new Schema<IShipment>(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: contactInfoSchema,
      required: true,
    },
    recipient: {
      type: contactInfoSchema,
      required: true,
    },
    cargo: {
      type: cargoSchema,
      required: true,
    },
    deliveryOption: {
      type: String,
      enum: ["standard", "express", "economy"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "received",
        "processing",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    estimatedDelivery: {
      type: Date,
      required: true,
    },
    trackingHistory: {
      type: [trackingEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Shipment = mongoose.model<IShipment>("Shipment", shipmentSchema);
export default Shipment;
