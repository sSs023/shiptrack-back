import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../server.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup.js";
import { createTestUser, sampleShipmentData } from "./helpers.js";
import type { TestUser } from "./helpers.js";

describe("Shipment Endpoints", () => {
  let customer: TestUser;
  let operator: TestUser;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  /** Helper to set up fresh users for each test */
  async function setupUsers() {
    customer = await createTestUser({
      name: "Customer",
      email: "customer@test.com",
      role: "customer",
    });
    operator = await createTestUser({
      name: "Operator",
      email: "operator@test.com",
      role: "operator",
    });
  }

  /** Helper to create a shipment via API */
  function createShipmentAsCustomer(data = sampleShipmentData) {
    return request(app)
      .post("/api/shipments")
      .set("Authorization", `Bearer ${customer.token}`)
      .send(data);
  }

  // ==================== CREATE SHIPMENT ====================

  describe("POST /api/shipments", () => {
    it("should create a shipment as customer", async () => {
      await setupUsers();

      const res = await createShipmentAsCustomer().expect(201);

      expect(res.body).toHaveProperty("trackingNumber");
      expect(res.body.trackingNumber).toMatch(/^SHT-\d{4}\d{4}$/);
      expect(res.body.status).toBe("pending");
      expect(res.body.customerId).toBe(customer.id);
      expect(res.body.sender.name).toBe("John Doe");
      expect(res.body.recipient.name).toBe("Jane Smith");
      expect(res.body.cargo.weight).toBe(2.5);
      expect(res.body.deliveryOption).toBe("standard");
      expect(res.body).toHaveProperty("estimatedDelivery");
      expect(res.body.trackingHistory).toHaveLength(1);
      expect(res.body.trackingHistory[0].status).toBe("pending");
      expect(res.body.trackingHistory[0].note).toBe("Shipment booked");
    });

    it("should auto-increment tracking numbers", async () => {
      await setupUsers();

      const res1 = await createShipmentAsCustomer().expect(201);
      const res2 = await createShipmentAsCustomer({
        ...sampleShipmentData,
        recipient: { ...sampleShipmentData.recipient, name: "Bob Jones" },
      }).expect(201);

      const num1 = parseInt(res1.body.trackingNumber.slice(-4), 10);
      const num2 = parseInt(res2.body.trackingNumber.slice(-4), 10);
      expect(num2).toBe(num1 + 1);
    });

    it("should compute estimatedDelivery based on deliveryOption", async () => {
      await setupUsers();

      const now = Date.now();

      const expressRes = await createShipmentAsCustomer({
        ...sampleShipmentData,
        deliveryOption: "express",
      }).expect(201);

      const economyRes = await createShipmentAsCustomer({
        ...sampleShipmentData,
        deliveryOption: "economy",
      }).expect(201);

      const expressDate = new Date(expressRes.body.estimatedDelivery).getTime();
      const economyDate = new Date(economyRes.body.estimatedDelivery).getTime();

      // Express should be ~1 day from now, economy ~7 days
      expect(expressDate).toBeLessThan(economyDate);
      // Express: roughly 1 day ahead
      expect(expressDate - now).toBeLessThan(2 * 24 * 60 * 60 * 1000);
      // Economy: roughly 7 days ahead
      expect(economyDate - now).toBeGreaterThan(5 * 24 * 60 * 60 * 1000);
    });

    it("should reject creation by operator", async () => {
      await setupUsers();

      const res = await request(app)
        .post("/api/shipments")
        .set("Authorization", `Bearer ${operator.token}`)
        .send(sampleShipmentData)
        .expect(403);

      expect(res.body).toHaveProperty("error");
    });

    it("should reject creation without auth", async () => {
      await request(app)
        .post("/api/shipments")
        .send(sampleShipmentData)
        .expect(401);
    });

    it("should return 400 for missing required fields", async () => {
      await setupUsers();

      const res = await request(app)
        .post("/api/shipments")
        .set("Authorization", `Bearer ${customer.token}`)
        .send({ sender: { name: "Partial" } })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it("should return 400 for invalid delivery option", async () => {
      await setupUsers();

      const res = await request(app)
        .post("/api/shipments")
        .set("Authorization", `Bearer ${customer.token}`)
        .send({
          ...sampleShipmentData,
          deliveryOption: "overnight",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });
  });

  // ==================== LIST SHIPMENTS ====================

  describe("GET /api/shipments", () => {
    it("should list only customer's own shipments for customers", async () => {
      await setupUsers();

      // Create 2 shipments as customer
      await createShipmentAsCustomer().expect(201);
      await createShipmentAsCustomer().expect(201);

      // Create another customer with a shipment
      const otherCustomer = await createTestUser({
        email: "other@test.com",
        role: "customer",
      });
      await request(app)
        .post("/api/shipments")
        .set("Authorization", `Bearer ${otherCustomer.token}`)
        .send(sampleShipmentData)
        .expect(201);

      // Customer should only see their own 2
      const res = await request(app)
        .get("/api/shipments")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.shipments).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should list all shipments for operators", async () => {
      await setupUsers();

      await createShipmentAsCustomer().expect(201);
      await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .get("/api/shipments")
        .set("Authorization", `Bearer ${operator.token}`)
        .expect(200);

      expect(res.body.shipments).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should filter by status", async () => {
      await setupUsers();

      await createShipmentAsCustomer().expect(201);

      // All new shipments are pending
      const res = await request(app)
        .get("/api/shipments?status=pending")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.shipments).toHaveLength(1);

      // No delivered shipments
      const res2 = await request(app)
        .get("/api/shipments?status=delivered")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res2.body.shipments).toHaveLength(0);
    });

    it("should search by tracking number", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);
      const trackingNumber = created.body.trackingNumber;

      const res = await request(app)
        .get(`/api/shipments?search=${trackingNumber}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.shipments).toHaveLength(1);
      expect(res.body.shipments[0].trackingNumber).toBe(trackingNumber);
    });

    it("should search by recipient name", async () => {
      await setupUsers();

      await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .get("/api/shipments?search=Jane")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.shipments).toHaveLength(1);
    });

    it("should return paginated results", async () => {
      await setupUsers();

      const res = await request(app)
        .get("/api/shipments?page=1")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body).toHaveProperty("page", 1);
      expect(res.body).toHaveProperty("totalPages");
      expect(res.body).toHaveProperty("total");
    });

    it("should reject unauthenticated requests", async () => {
      await request(app).get("/api/shipments").expect(401);
    });
  });

  // ==================== GET SHIPMENT BY ID ====================

  describe("GET /api/shipments/:id", () => {
    it("should return a shipment for its owner", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .get(`/api/shipments/${created.body._id}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.trackingNumber).toBe(created.body.trackingNumber);
      // customerId should be populated
      expect(res.body.customerId).toHaveProperty("name");
      expect(res.body.customerId).toHaveProperty("email");
    });

    it("should return a shipment for operator (any shipment)", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .get(`/api/shipments/${created.body._id}`)
        .set("Authorization", `Bearer ${operator.token}`)
        .expect(200);

      expect(res.body.trackingNumber).toBe(created.body.trackingNumber);
    });

    it("should return 403 when customer accesses another customer's shipment", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const otherCustomer = await createTestUser({
        email: "other2@test.com",
        role: "customer",
      });

      await request(app)
        .get(`/api/shipments/${created.body._id}`)
        .set("Authorization", `Bearer ${otherCustomer.token}`)
        .expect(403);
    });

    it("should return 404 for non-existent shipment", async () => {
      await setupUsers();

      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/api/shipments/${fakeId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(404);

      expect(res.body).toHaveProperty("error");
    });
  });

  // ==================== PUBLIC TRACKING ====================

  describe("GET /api/shipments/track/:trackingNumber", () => {
    it("should return shipment details for valid tracking number (no auth)", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .get(`/api/shipments/track/${created.body.trackingNumber}`)
        .expect(200);

      expect(res.body.trackingNumber).toBe(created.body.trackingNumber);
      expect(res.body.status).toBe("pending");
      expect(res.body).toHaveProperty("trackingHistory");
      expect(res.body).toHaveProperty("estimatedDelivery");
    });

    it("should return 404 for invalid tracking number", async () => {
      const res = await request(app)
        .get("/api/shipments/track/SHT-99999999")
        .expect(404);

      expect(res.body.error).toBe(
        "No shipment found for that tracking number.",
      );
    });
  });

  // ==================== UPDATE SHIPMENT STATUS ====================

  describe("PATCH /api/shipments/:id/status", () => {
    it("should update status as operator", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({
          status: "received",
          note: "Package received at facility",
          location: "New York Hub",
        })
        .expect(200);

      expect(res.body.status).toBe("received");
      expect(res.body.trackingHistory).toHaveLength(2);

      const latestEntry =
        res.body.trackingHistory[res.body.trackingHistory.length - 1];
      expect(latestEntry.status).toBe("received");
      expect(latestEntry.note).toBe("Package received at facility");
      expect(latestEntry.location).toBe("New York Hub");
    });

    it("should append multiple status updates to tracking history", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      // First update
      await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({ status: "received", note: "Received" })
        .expect(200);

      // Second update
      await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({ status: "processing", note: "Processing" })
        .expect(200);

      // Third update
      const res = await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({ status: "in_transit", note: "Shipped", location: "LA" })
        .expect(200);

      expect(res.body.status).toBe("in_transit");
      expect(res.body.trackingHistory).toHaveLength(4); // initial + 3 updates
    });

    it("should reject status update by customer", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${customer.token}`)
        .send({ status: "received" })
        .expect(403);
    });

    it("should reject invalid status value", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      const res = await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({ status: "shipped" })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });

    it("should return 404 for non-existent shipment", async () => {
      await setupUsers();

      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .patch(`/api/shipments/${fakeId}/status`)
        .set("Authorization", `Bearer ${operator.token}`)
        .send({ status: "received" })
        .expect(404);

      expect(res.body).toHaveProperty("error");
    });

    it("should reject unauthenticated status update", async () => {
      await setupUsers();

      const created = await createShipmentAsCustomer().expect(201);

      await request(app)
        .patch(`/api/shipments/${created.body._id}/status`)
        .send({ status: "received" })
        .expect(401);
    });
  });

  // ==================== GENERAL / EDGE CASES ====================

  describe("General", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/unknown").expect(404);
      expect(res.body).toHaveProperty("error", "Route not found.");
    });

    it("health check should return ok", async () => {
      const res = await request(app).get("/").expect(200);
      expect(res.body).toMatchObject({
        status: "ok",
        service: "ShipTrack API",
      });
    });
  });
});
