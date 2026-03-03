import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../server.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup.js";
import { createTestUser } from "./helpers.js";

describe("Auth Endpoints", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  // ==================== REGISTER ====================

  describe("POST /api/auth/register", () => {
    it("should register a new customer successfully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
        })
        .expect(201);

      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        name: "Alice",
        email: "alice@example.com",
        role: "customer",
      });
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user).not.toHaveProperty("password");
    });

    it("should register an operator when role is specified", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Bob Operator",
          email: "bob@example.com",
          password: "password123",
          role: "operator",
        })
        .expect(201);

      expect(res.body.user.role).toBe("operator");
    });

    it("should return 409 if email already exists", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
        })
        .expect(201);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Alice Duplicate",
          email: "alice@example.com",
          password: "password456",
        })
        .expect(409);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 if name is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "noname@example.com",
          password: "password123",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });

    it("should return 400 if email is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test",
          email: "not-an-email",
          password: "password123",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });

    it("should return 400 if password is too short", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test",
          email: "test@example.com",
          password: "12345",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });

    it("should return 400 if role is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test",
          email: "test@example.com",
          password: "password123",
          role: "admin",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });
  });

  // ==================== LOGIN ====================

  describe("POST /api/auth/login", () => {
    it("should login successfully with correct credentials", async () => {
      await createTestUser({
        email: "login@example.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "password123",
        })
        .expect(200);

      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("should return 401 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 401 for wrong password", async () => {
      await createTestUser({
        email: "wrongpass@example.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrongpass@example.com",
          password: "wrong-password",
        })
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "password123" })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed.");
    });
  });

  // ==================== GET ME ====================

  describe("GET /api/auth/me", () => {
    it("should return the authenticated user profile", async () => {
      const user = await createTestUser({
        name: "Me User",
        email: "me@example.com",
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        name: "Me User",
        email: "me@example.com",
        role: "customer",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should return 401 without a token", async () => {
      const res = await request(app).get("/api/auth/me").expect(401);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 401 with an invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token-here")
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });
  });
});
