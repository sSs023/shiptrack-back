import Shipment from "../models/Shipment.js";
import type { DeliveryOption } from "../types/index.js";

export async function generateTrackingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SHT-${year}`;

  const latest = await Shipment.findOne({
    trackingNumber: { $regex: `^${prefix}` },
  })
    .sort({ trackingNumber: -1 })
    .select("trackingNumber")
    .lean();

  let nextNum = 1;
  if (latest) {
    const currentNum = parseInt(latest.trackingNumber.slice(prefix.length), 10);
    nextNum = currentNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
}

export function computeEstimatedDelivery(option: DeliveryOption): Date {
  const now = new Date();
  const daysMap: Record<DeliveryOption, number> = {
    express: 1,
    standard: 3,
    economy: 7,
  };
  now.setDate(now.getDate() + daysMap[option]);
  return now;
}
