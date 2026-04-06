# Finance Dashboard Backend

A production-ready backend API for a finance dashboard system — built with **Node.js**, **Express**, and **MongoDB**. Supports role-based access control, financial record management, and aggregated analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Decisions](#architecture-decisions)
- [Getting Started](#getting-started)
- [Role & Access Control Matrix](#role--access-control-matrix)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Assumptions & Tradeoffs](#assumptions--tradeoffs)

---

## Tech Stack

| Layer       | Choice           | Reason                                              |
|-------------|------------------|-----------------------------------------------------|
| Runtime     | Node.js          | Async I/O, great ecosystem for REST APIs            |
| Framework   | Express          | Minimal, well-understood, easy to structure         |
| Database    | MongoDB (Mongoose) | Flexible schema, native aggregation pipelines    |
| Auth        | JWT (jsonwebtoken) | Stateless, scalable, no session storage needed    |
| Validation  | express-validator | Declarative, composable, clear error messages     |
| Security    | helmet, cors, rate-limit | Industry-standard Express security layer   |
| Testing     | Jest + Supertest | Integration tests against a real test DB           |

---

## Project Structure

```
src/
├── config/
│   ├── env.js              # Centralized environment config
│   └── database.js         # MongoDB connection + graceful disconnect
│
├── models/
│   ├── User.js             # User schema: name, email, password, role, isActive
│   └── Transaction.js      # Transaction schema: amount, type, category, date, soft-delete
│
├── services/               # Business logic layer (no Express req/res here)
│   ├── authService.js      # register, login, token generation
│   ├── userService.js      # CRUD + role enforcement
│   ├── transactionService.js # CRUD + soft delete + ownership checks
│   └── dashboardService.js # Aggregation pipelines for analytics
│
├── controllers/            # HTTP layer: parse req → call service → send response
│   ├── authController.js
│   ├── userController.js
│   ├── transactionController.js
│   └── dashboardController.js
│
├── routes/                 # Route definitions with middleware chains
│   ├── index.js            # Central router
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── transactionRoutes.js
│   └── dashboardRoutes.js
│
├── middleware/
│   ├── auth.js             # authenticate (JWT verify) + authorize (role check)
│   ├── validate.js         # express-validator error collector
│   └── errorHandler.js     # Global error handler + 404 handler
│
├── validators/             # express-validator rule chains, separate from routes
│   ├── authValidators.js
│   ├── transactionValidators.js
│   └── userValidators.js
│
├── utils/
│   ├── apiResponse.js      # Standardized success/error response helpers
│   ├── pagination.js       # Parse query params + build pagination meta
│   ├── AppError.js         # Custom operational error class
│   └── seed.js             # Database seed script
│
├── app.js                  # Express app (middleware, routes) — no server.listen
└── server.js               # Entry point: connect DB, start server, handle signals

tests/
└── api.test.js             # Integration tests (Jest + Supertest)
```

---

## Architecture Decisions

### 1. Service Layer Separation
Controllers only handle HTTP (parse request, call service, send response). All business logic lives in services. This makes services independently testable and keeps controllers thin.

### 2. Middleware Chain Ordering
Every protected route follows: `authenticate → authorize → validate → controller`. Order matters — auth is always checked before validation, so we never waste compute validating requests from unauthenticated users.

### 3. Soft Delete
Transactions are never permanently deleted by default. The `isDeleted` flag is set with `deletedAt` and `deletedBy` for auditing. A Mongoose query middleware `pre(/^find/)` automatically filters these out unless `includeDeleted` is explicitly set.

### 4. Aggregation for Analytics
Dashboard endpoints use MongoDB's native aggregation pipeline rather than fetching all records and computing in-app. This keeps analytics efficient at scale and pushes computation to the database tier.

### 5. AppError vs Generic Errors
`AppError` marks errors as `isOperational: true`. The global error handler uses this to distinguish safe-to-expose errors (400, 401, 403, 404, 409) from programming bugs (500). In production mode, 500 errors return a generic message to avoid leaking internals.

### 6. app.js vs server.js Split
`app.js` exports the Express instance without binding to a port. `server.js` does the binding. This pattern allows integration tests (Supertest) to import and test `app` without starting a real server.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### Setup

```bash
# 1. Clone / enter project
cd finance-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MONGODB_URI and JWT_SECRET

# 4. Seed demo data (optional)
npm run seed

# 5. Start development server
npm run dev
```

### Demo Credentials (after seeding)

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@finance.dev      | password123  |
| Analyst  | analyst@finance.dev    | password123  |
| Viewer   | viewer@finance.dev     | password123  |

### Running Tests

```bash
# Requires MongoDB running locally (uses finance_test_db)
npm test
```

---

## Role & Access Control Matrix

| Action                         | Viewer | Analyst | Admin |
|--------------------------------|:------:|:-------:|:-----:|
| Register / Login               | ✅     | ✅      | ✅    |
| View own profile               | ✅     | ✅      | ✅    |
| List all users                 | ❌     | ❌      | ✅    |
| Update any user                | ❌     | ❌      | ✅    |
| Deactivate / Delete user       | ❌     | ❌      | ✅    |
| View transactions (list/detail)| ✅     | ✅      | ✅    |
| Create transactions            | ❌     | ✅      | ✅    |
| Update own transactions        | ❌     | ✅      | ✅    |
| Update any transaction         | ❌     | ❌      | ✅    |
| Delete own transactions        | ❌     | ✅      | ✅    |
| Delete any transaction         | ❌     | ❌      | ✅    |
| Dashboard / Analytics          | ❌     | ✅      | ✅    |

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated routes require:
```
Authorization: Bearer <token>
```

All responses follow this shape:
```json
{
  "success": true | false,
  "message": "...",
  "data": { ... },       // present on success
  "meta": { ... },       // present on paginated responses
  "errors": [ ... ]      // present on validation failures
}
```

---

### Auth

#### `POST /api/auth/register`
Register a new user. Without admin auth, role defaults to `viewer`.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "analyst"         // optional; only respected if caller is admin
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "...", "name": "Jane Doe", "email": "...", "role": "viewer" }
  }
}
```

---

#### `POST /api/auth/login`
**Body:** `{ "email": "...", "password": "..." }`
**Response `200`:** `{ "data": { "token": "...", "user": { ... } } }`

---

#### `GET /api/auth/me` 
Returns the currently authenticated user's profile.

---

### Users 

#### `GET /api/users` *(admin only)*
List all users.

**Query params:** `page`, `limit`, `role` (admin|analyst|viewer), `isActive` (true|false)

---

#### `GET /api/users/:id` *(admin: any user; others: own only)*
Get user by ID.

---

#### `PATCH /api/users/:id`
Update user. Admins can change `name`, `role`, `isActive`. Non-admins can only update their own `name`.

**Body (admin):** `{ "name": "...", "role": "analyst", "isActive": false }`

---

#### `PATCH /api/users/:id/deactivate` *(admin only)*
Sets `isActive: false`. Cannot deactivate self.

---

#### `DELETE /api/users/:id` *(admin only)*
Permanently deletes user. Cannot delete self.

---

### Transactions 

#### `GET /api/transactions`
List transactions. All roles can read.

**Query params:**

| Param       | Type   | Example              | Description                  |
|-------------|--------|----------------------|------------------------------|
| `page`      | int    | `1`                  | Page number (default: 1)     |
| `limit`     | int    | `20`                 | Results per page (max: 100)  |
| `type`      | string | `income`             | Filter by type               |
| `category`  | string | `food`               | Filter by category           |
| `startDate` | ISO    | `2024-01-01`         | From date (inclusive)        |
| `endDate`   | ISO    | `2024-12-31`         | To date (inclusive)          |
| `search`    | string | `rent`               | Full-text search on description/notes |
| `sortBy`    | string | `amount`             | `date`, `amount`, `createdAt`|
| `sortOrder` | string | `asc`                | `asc` or `desc`              |

**Response meta:**
```json
{ "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNextPage": true, "hasPrevPage": false }
```

---

#### `GET /api/transactions/:id`
Get transaction by ID. All roles.

---

#### `POST /api/transactions` *(analyst, admin)*
Create a transaction.

**Body:**
```json
{
  "amount": 3500.00,
  "type": "income",
  "category": "salary",
  "date": "2024-03-15",
  "description": "March salary",
  "notes": "Transferred to savings"
}
```

**Transaction types:** `income`, `expense`

**Categories (income):** `salary`, `freelance`, `investment`, `bonus`, `other_income`

**Categories (expense):** `food`, `housing`, `transport`, `utilities`, `healthcare`, `entertainment`, `education`, `shopping`, `other_expense`

---

#### `PATCH /api/transactions/:id` *(analyst: own; admin: any)*
Update any combination of fields.

---

#### `DELETE /api/transactions/:id` *(analyst: own; admin: any)*
Soft deletes the record (`isDeleted: true`). Record is hidden from all list queries.

---

### Dashboard  *(analyst, admin only)*

#### `GET /api/dashboard/summary`
**Query:** `startDate?`, `endDate?`
```json
{
  "totalIncome": 25000,
  "totalExpenses": 9400,
  "netBalance": 15600,
  "incomeCount": 8,
  "expenseCount": 32
}
```

---

#### `GET /api/dashboard/categories`
**Query:** `startDate?`, `endDate?`, `type?`
```json
{
  "breakdown": [
    { "category": "salary", "type": "income", "total": 18000, "count": 3, "avgAmount": 6000 }
  ]
}
```

---

#### `GET /api/dashboard/trends/monthly`
**Query:** `months?` (default: 12)
```json
{
  "trends": [
    { "period": "2024-01", "year": 2024, "month": 1, "income": 6000, "expenses": 2300, "net": 3700 }
  ]
}
```

---

#### `GET /api/dashboard/trends/weekly`
**Query:** `weeks?` (default: 8)
```json
{
  "trends": [
    { "period": "2024-W03", "year": 2024, "week": 3, "income": 1500, "expenses": 600, "net": 900 }
  ]
}
```

---

#### `GET /api/dashboard/recent`
**Query:** `limit?` (default: 10, max: 50)
Returns latest N transactions with creator info.

---

#### `GET /api/dashboard/top-categories`
**Query:** `limit?` (default: 5), `startDate?`, `endDate?`
Top expense categories ranked by total spend.

---

### Health Check

#### `GET /health` *(public)*
```json
{ "success": true, "message": "Finance Dashboard API is running.", "environment": "development" }
```

---

## Data Models

### User
```
_id          ObjectId
name         String (2–100 chars)
email        String (unique, lowercase)
password     String (bcrypt hashed, select: false)
role         Enum: viewer | analyst | admin (default: viewer)
isActive     Boolean (default: true)
lastLogin    Date
createdAt    Date
updatedAt    Date
```

### Transaction
```
_id          ObjectId
amount       Number (> 0)
type         Enum: income | expense
category     Enum: salary | food | housing | ... (9 income + expense categories)
date         Date
description  String (max 500)
notes        String (max 1000)
createdBy    ObjectId → User
isDeleted    Boolean (soft delete, select: false)
deletedAt    Date (select: false)
deletedBy    ObjectId → User (select: false)
createdAt    Date
updatedAt    Date
```

---

## Assumptions & Tradeoffs

| Decision | Assumption / Tradeoff |
|---|---|
| JWT over sessions | Stateless auth is appropriate; no server-side session store needed |
| Soft delete only | Financial data should be auditable; hard deletes are destructive |
| Viewers cannot create | Financial entry is a privileged action; viewers are read-only consumers |
| Analysts can edit own records | Ownership-scoped write access without requiring full admin privileges |
| Aggregations skip deleted records | Soft-deleted entries are excluded from analytics to reflect actual state |
| Password not in select | Prevents accidental password hash leakage in API responses |
| `app.js` / `server.js` split | Enables clean integration testing without port binding |
| Test DB is local MongoDB | No in-memory library used; tests require MongoDB to be running locally |
| No refresh tokens | Simplification; production would add refresh token rotation |
| Rate limit on `/api` prefix only | Health check is excluded so infrastructure probes aren't throttled |
