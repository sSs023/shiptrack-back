import request from "supertest";
import app from "../server.js";
import User from "../models/User.js";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

/**
 * Create a test user and return the user data with auth token.
 */
export async function createTestUser(
  overrides: {
    name?: string;
    email?: string;
    password?: string;
    role?: "customer" | "operator";
  } = {},
): Promise<TestUser> {
  const userData = {
    name: overrides.name || "Test User",
    email: overrides.email || `test-${Date.now()}@example.com`,
    password: overrides.password || "password123",
    role: overrides.role || "customer",
  };

  const res = await request(app)
    .post("/api/auth/register")
    .send(userData)
    .expect(201);

  return {
    id: res.body.user.id,
    name: res.body.user.name,
    email: res.body.user.email,
    role: res.body.user.role,
    token: res.body.token,
  };
}

/**
 * Sample shipment data for tests
 */
export const sampleShipmentData = {
  sender: {
    name: "John Doe",
    address: "123 Main St, New York, NY",
    phone: "+1-555-0100",
  },
  recipient: {
    name: "Jane Smith",
    address: "456 Oak Ave, Los Angeles, CA",
    phone: "+1-555-0200",
  },
  cargo: {
    description: "Electronics - Laptop",
    weight: 2.5,
    dimensions: "40x30x10 cm",
  },
  deliveryOption: "standard",
};
