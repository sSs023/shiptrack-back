import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ShipTrack API",
      version: "1.0.0",
      description:
        "RESTful API for shipment tracking — register, create shipments, track packages, and manage delivery status.",
      contact: {
        name: "ShipTrack Support",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API base path",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token obtained from /auth/login or /auth/register",
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              maxLength: 100,
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              example: "secret123",
            },
            role: {
              type: "string",
              enum: ["customer", "operator"],
              default: "customer",
              description: "User role (defaults to customer)",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              example: "secret123",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: {
              $ref: "#/components/schemas/UserSummary",
            },
          },
        },
        UserSummary: {
          type: "object",
          properties: {
            id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            role: { type: "string", enum: ["customer", "operator"] },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            role: { type: "string", enum: ["customer", "operator"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ── Shipment ──────────────────────────────
        ContactInfo: {
          type: "object",
          required: ["name", "address", "phone"],
          properties: {
            name: { type: "string", example: "Alice Smith" },
            address: { type: "string", example: "123 Main St, NY 10001" },
            phone: { type: "string", example: "+1-555-0100" },
          },
        },
        Cargo: {
          type: "object",
          required: ["description", "weight", "dimensions"],
          properties: {
            description: { type: "string", example: "Electronics" },
            weight: { type: "number", minimum: 0.01, example: 2.5 },
            dimensions: { type: "string", example: "30x20x15 cm" },
          },
        },
        TrackingEntry: {
          type: "object",
          properties: {
            status: {
              type: "string",
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
            timestamp: { type: "string", format: "date-time" },
            note: { type: "string", example: "Shipment booked" },
            location: { type: "string", example: "New York Hub" },
          },
        },
        CreateShipmentRequest: {
          type: "object",
          required: ["sender", "recipient", "cargo", "deliveryOption"],
          properties: {
            sender: { $ref: "#/components/schemas/ContactInfo" },
            recipient: { $ref: "#/components/schemas/ContactInfo" },
            cargo: { $ref: "#/components/schemas/Cargo" },
            deliveryOption: {
              type: "string",
              enum: ["standard", "express", "economy"],
              example: "standard",
            },
          },
        },
        Shipment: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            trackingNumber: { type: "string", example: "ST-20260303-A1B2C3" },
            customerId: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            sender: { $ref: "#/components/schemas/ContactInfo" },
            recipient: { $ref: "#/components/schemas/ContactInfo" },
            cargo: { $ref: "#/components/schemas/Cargo" },
            deliveryOption: {
              type: "string",
              enum: ["standard", "express", "economy"],
            },
            status: {
              type: "string",
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
            estimatedDelivery: { type: "string", format: "date-time" },
            trackingHistory: {
              type: "array",
              items: { $ref: "#/components/schemas/TrackingEntry" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ShipmentListResponse: {
          type: "object",
          properties: {
            shipments: {
              type: "array",
              items: { $ref: "#/components/schemas/Shipment" },
            },
            page: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 5 },
            total: { type: "integer", example: 42 },
          },
        },
        UpdateStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: [
                "pending",
                "received",
                "processing",
                "in_transit",
                "out_for_delivery",
                "delivered",
                "failed",
              ],
              example: "in_transit",
            },
            note: { type: "string", example: "Package departed warehouse" },
            location: { type: "string", example: "Chicago Hub" },
          },
        },
        TrackingResponse: {
          type: "object",
          properties: {
            trackingNumber: { type: "string", example: "ST-20260303-A1B2C3" },
            status: {
              type: "string",
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
            estimatedDelivery: { type: "string", format: "date-time" },
            "sender.address": { type: "string" },
            "recipient.address": { type: "string" },
            deliveryOption: {
              type: "string",
              enum: ["standard", "express", "economy"],
            },
            trackingHistory: {
              type: "array",
              items: { $ref: "#/components/schemas/TrackingEntry" },
            },
          },
        },

        // ── Common ────────────────────────────────
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Error message" },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "Please provide a valid email." },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
