# ShipTrack — MVP Feature Specification
**Shipment Booking & Tracking Web Platform**
**Stack: React (Frontend) · Express.js (Backend) · MongoDB (Database)**

---

## Overview

This document describes the MVP scope for every feature outlined in the Statement of Work. The backend is a RESTful Express.js API connected to a real MongoDB database via Mongoose. The frontend is a React SPA consuming that API. No payment system is required for the MVP.

---

## User Roles

The app supports two roles, stored on each user document in MongoDB:

- **Customer** — can book shipments and track their own orders.
- **Operator** — can view all shipments and update their statuses.

---

## Backend (Express.js + MongoDB/Mongoose)

### 1. Database Models (Mongoose Schemas)

**`User` schema:**
- `name` — String, required
- `email` — String, required, unique
- `password` — String, required (stored as a bcrypt hash)
- `role` — String, enum `['customer', 'operator']`, default `'customer'`
- `createdAt` — Date, default `Date.now`

**`Shipment` schema:**
- `trackingNumber` — String, required, unique (auto-generated on creation, e.g. `SHT-20240001`)
- `customerId` — ObjectId, ref `'User'`, required
- `sender` — nested object: `{ name, address, phone }` — all String, required
- `recipient` — nested object: `{ name, address, phone }` — all String, required
- `cargo` — nested object: `{ description, weight, dimensions }` — String/Number, required
- `deliveryOption` — String, enum `['standard', 'express', 'economy']`, required
- `status` — String, enum `['pending', 'received', 'processing', 'in_transit', 'out_for_delivery', 'delivered', 'failed']`, default `'pending'`
- `estimatedDelivery` — Date (computed based on deliveryOption at creation time)
- `trackingHistory` — array of embedded subdocuments: `{ status, timestamp, note, location }`
- `createdAt`, `updatedAt` — Date, managed by Mongoose timestamps option

---

### 2. Auth Endpoints

**`POST /api/auth/register`**
- Accepts `{ name, email, password, role }`.
- Hashes the password with bcrypt before saving.
- Creates and saves a new `User` document in MongoDB.
- Returns `{ token, user: { id, name, role } }`.
- Returns `409` if the email already exists.

**`POST /api/auth/login`**
- Accepts `{ email, password }`.
- Finds the user by email in MongoDB. Returns `401` if not found.
- Compares the provided password against the stored hash using bcrypt.
- On success, signs and returns a JWT containing `{ userId, role }` and the user object.
- Returns `401` on wrong password.

**`GET /api/auth/me`** *(Protected)*
- Reads the JWT from the `Authorization` header.
- Returns the currently authenticated user's profile from MongoDB.

---

### 3. Shipment Endpoints

**`POST /api/shipments`** *(Customer only)*
- Accepts: sender, recipient, cargo, deliveryOption.
- Generates a unique `trackingNumber` (query MongoDB for the latest number and increment).
- Computes `estimatedDelivery` based on deliveryOption (economy +7 days, standard +3 days, express +1 day).
- Creates the first `trackingHistory` entry: `{ status: 'pending', note: 'Shipment booked', timestamp: now }`.
- Saves the new `Shipment` document with `customerId` set to the authenticated user's ID.
- Returns the created shipment object.

**`GET /api/shipments`** *(Protected, role-aware)*
- Operators receive all shipments from MongoDB.
- Customers receive only shipments where `customerId` matches their ID.
- Supports query params:
  - `?search=` — matches against `trackingNumber` or `recipient.name` using a case-insensitive regex.
  - `?status=` — filters by exact status value.
- Returns a paginated list (20 per page) with `?page=` support.

**`GET /api/shipments/:id`** *(Protected)*
- Fetches a single shipment by MongoDB `_id`.
- Populates the `customerId` field with basic user info (name, email).
- Customers can only access their own shipments; returns `403` otherwise.
- Operators can access any shipment.

**`GET /api/shipments/track/:trackingNumber`** *(Public — no auth required)*
- Finds a shipment by `trackingNumber` in MongoDB.
- Returns shipment details and the full `trackingHistory` array.
- Returns `404` if not found.

**`PATCH /api/shipments/:id/status`** *(Operator only)*
- Accepts `{ status, note, location }`.
- Validates `status` is a valid enum value.
- Pushes a new entry onto `trackingHistory`: `{ status, note, location, timestamp: now }`.
- Updates `status` and triggers Mongoose's `updatedAt` timestamp.
- Saves the document and returns the updated shipment.

---

### 4. Middleware

**JWT Auth middleware** — reads the `Authorization: Bearer <token>` header, verifies the JWT using the app secret, and attaches the decoded `{ userId, role }` to `req.user`. Returns `401` if the token is missing, expired, or invalid.

**Role guard middleware** — a reusable factory function `requireRole('operator')` that checks `req.user.role` and returns `403` if it doesn't match. Applied at the route level.

**Error handler middleware** — a global Express error handler at the bottom of the middleware stack. Catches unhandled errors and returns a consistent `{ error: message }` JSON response with the appropriate status code.

---

## Frontend (React)

### 5. App Shell & Navigation

A top navigation bar present on all authenticated pages with:
- App logo/name on the left.
- Nav links: **Book Shipment**, **My Shipments** (customer) or **All Shipments** (operator), **Track a Package**.
- User name and role badge on the right with a **Logout** button.

A React Context (`AuthContext`) stores the logged-in user and JWT token (persisted in `localStorage`). A private route wrapper checks auth state and redirects unauthenticated users to the login page. On app load, the token is read from `localStorage` and validated against `GET /api/auth/me`.

---

### 6. Login & Register Pages

**Login page:** A centered form with email and password fields. On success, stores the token in `localStorage` and user in `AuthContext`, then redirects to the dashboard. Shows an inline error on failure.

**Register page:** A form with name, email, password, and a role selector (Customer / Operator). On success, automatically logs the user in and redirects to the dashboard.

Both pages include a link to switch between login and register.

---

### 7. Dashboard Page

**Customer view:**
- Summary cards showing: Total Shipments, In Transit, Delivered.
- A "Recent Shipments" table showing the last 5 shipments with tracking number, recipient name, status badge, and a **View** link.
- A prominent **Book a Shipment** CTA button.

**Operator view:**
- Summary cards showing: Total Shipments, Pending, In Transit, Delivered.
- The full shipments table (same as the Shipments List page) rendered directly on the dashboard.

Data is fetched from `GET /api/shipments` on mount.

---

### 8. Book Shipment Page *(Customer only)*

A multi-section form organized into three parts:

**Sender Info:** Name, Address, Phone.

**Recipient Info:** Name, Address, Phone.

**Cargo & Delivery:** Description, Weight (kg), Dimensions, and a Delivery Option selector showing Standard / Express / Economy as cards with their estimated delivery timeframes.

On submit, calls `POST /api/shipments`. On success, redirects to the new shipment's detail page and shows a success banner displaying the generated tracking number.

---

### 9. Shipments List Page

A searchable, filterable table of shipments fetched from `GET /api/shipments`.

- A text input that calls the API with `?search=` on change (debounced).
- A status filter dropdown that calls the API with `?status=`.
- Each row shows: Tracking Number, Recipient, Delivery Option, Status badge (color-coded), Created date, and a **View** button.
- Pagination controls at the bottom.
- Clicking **View** navigates to the Shipment Detail page.

---

### 10. Shipment Detail Page

Fetches data from `GET /api/shipments/:id` and displays all shipment information in clearly labeled sections:

**Header:** Tracking number, current status badge, estimated delivery date.

**Sender & Recipient:** Side-by-side cards with name, address, phone.

**Cargo Info:** Description, weight, dimensions, delivery option.

**Tracking Timeline:** A vertical timeline listing each `trackingHistory` entry in reverse-chronological order (newest first), showing status, timestamp, location, and note. The most recent entry is visually highlighted.

**Operator-only panel:** A form visible only to operators, positioned below the timeline. Fields: Status dropdown, Location (text input), Note (textarea). Submits to `PATCH /api/shipments/:id/status` and refreshes the shipment data on success.

---

### 11. Public Tracking Page

Accessible without login at `/track`. A page with a single large text input and a **Track** button.

On submit, calls `GET /api/shipments/track/:trackingNumber`. If found, displays the shipment's current status, estimated delivery, origin city, destination city, and the full tracking timeline. If not found, shows a "No shipment found for that tracking number" message.

---

### 12. Reusable Components

**`<StatusBadge>`** — a pill component used throughout the app. Each status maps to a distinct color:

| Status | Color |
|---|---|
| pending | Gray |
| received | Blue |
| processing | Yellow |
| in_transit | Orange |
| out_for_delivery | Purple |
| delivered | Green |
| failed | Red |

**`<TrackingTimeline>`** — renders a vertical timeline from a `trackingHistory` array. Used on both the Shipment Detail page and the Public Tracking page.

**`<PrivateRoute>`** — wraps React Router routes. Redirects to `/login` if the user is not authenticated. Accepts an optional `role` prop to also enforce role-based access.

---

## Environment Configuration

The backend requires a `.env` file with:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — secret key for signing JWTs
- `PORT` — port for the Express server (default `5000`)

The frontend requires a `.env` file with:
- `REACT_APP_API_URL` — base URL of the backend API (e.g. `http://localhost:5000`)

---

## Out of Scope for MVP

- Payment system (no implementation, no mock)
- Native mobile app
- Email/SMS notifications
- Admin panel for managing users
- Integration tests (unit tests for core logic are optional but encouraged)
