# AT Facility — Full Project Context

> **Read this file first** before making any changes to the codebase.
> Last updated: 2026-05-31

---

## 1. What is AT Facility?

AT Facility is an **Indian ride-hailing + travel services platform** with three core offerings:

| Service      | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| **Trips**    | One-way / round-trip cab bookings with multi-waypoint itineraries   |
| **Packages** | Curated travel packages (beach, hills, city-break, wildlife)        |
| **Rentals**  | Self-drive car rentals with optional driver add-on, postpaid extras |

There are **three user roles**: `CUSTOMER`, `DRIVER`, `ADMIN`.

---

## 2. Monorepo Structure

```
atfacility/                          ← Root (npm workspaces)
├── apps/
│   └── mobile/                      ← Expo (React Native) app
│       ├── app/                     ← File-based routing (expo-router)
│       │   ├── (admin)/             ← Admin screens (tabs: dashboard, users, verify)
│       │   ├── (auth)/              ← Login / OTP screens
│       │   ├── (customer)/          ← Customer flow
│       │   ├── (driver)/            ← Driver flow
│       │   └── (onboarding)/        ← Profile completion
│       ├── components/
│       ├── constants/
│       ├── store/                   ← Zustand stores (auth.ts, driver.ts, mock.ts)
│       ├── utils/                   ← api.ts (Axios), socket.ts (Socket.io client), secureStorage.ts
│       └── types/
│
├── backend/                         ← Fastify API server
│   ├── prisma/
│   │   ├── schema.prisma            ← Single source of truth for DB schema
│   │   ├── seed.ts                  ← Seeds admin user + sample packages
│   │   └── migrations/
│   ├── src/
│   │   ├── server.ts                ← Entrypoint — starts Fastify + Socket.io
│   │   ├── app.ts                   ← Fastify plugin registration (cors, helmet, jwt, multipart, rate-limit)
│   │   ├── routes.ts                ← Central route registrar
│   │   ├── config/
│   │   │   └── pricing.ts           ← Flat rates & per-km segment rates
│   │   ├── modules/                 ← Feature modules (controller → service → prisma)
│   │   │   ├── admin/               ← Admin APIs (KYC queue, ID proofs, stats, user mgmt)
│   │   │   ├── auth/                ← OTP-based auth, JWT token pairs, refresh rotation
│   │   │   ├── customer/            ← Customer ID proof upload (presigned S3 URLs)
│   │   │   ├── driver/              ← (empty — driver logic lives in trips + kyc)
│   │   │   ├── kyc/                 ← Driver document upload + KYC submission
│   │   │   ├── notifications/       ← Firebase FCM push + in-app notifications
│   │   │   ├── packages/            ← Travel package CRUD + booking
│   │   │   ├── payments/            ← Razorpay order creation + webhook verification
│   │   │   ├── rentals/             ← Vehicle rental bookings
│   │   │   └── trips/               ← Trip estimation, creation, acceptance, lifecycle + Socket gateway
│   │   └── shared/
│   │       ├── db/prisma.ts         ← Singleton PrismaClient
│   │       ├── logger/logger.ts     ← Pino logger with pino-pretty
│   │       ├── middleware/
│   │       │   ├── auth.guard.ts    ← JWT verification preHandler
│   │       │   ├── role.guard.ts    ← Role-based access control
│   │       │   └── error.handler.ts ← Global Fastify error handler
│   │       ├── redis/redis.ts       ← ioredis client + OTPRedis + LocationRedis helpers
│   │       ├── socket/
│   │       │   ├── socket.ts        ← Exports global `io` instance + `setIO()`
│   │       │   ├── socket.events.ts ← All event name constants
│   │       │   └── socket.handler.ts← `safeSocketHandler()` error wrapper
│   │       ├── storage/s3.ts        ← (empty — S3 clients are inline in kyc + customer services)
│   │       ├── types/
│   │       │   ├── enums.ts         ← All enums mirroring Prisma schema
│   │       │   └── index.ts         ← JWTPayload, APIResponse, PaginatedResponse types
│   │       └── utils/
│   │           ├── response.ts      ← sendSuccess/sendError/sendUnauthorized/sendForbidden/sendNotFound
│   │           ├── phone.ts         ← Phone validation + formatting (libphonenumber-js)
│   │           └── otp.ts           ← OTP generation utility
│   ├── .env                         ← All secrets (Supabase PG, Upstash Redis, AWS S3, Razorpay, Firebase, Google Maps)
│   ├── Dockerfile
│   └── docker.compose.yml
│
├── package.json                     ← Root scripts: `npm run mobile`, `npm run backend`
└── .husky/                          ← Pre-commit hooks (prettier)
```

---

## 3. Tech Stack

### Backend

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| **Framework**  | Fastify 5 with Zod type-provider                           |
| **ORM**        | Prisma 5 (PostgreSQL on Supabase, PgBouncer pooling)       |
| **Auth**       | `@fastify/jwt` for HTTP, raw `jsonwebtoken` for Socket.io  |
| **Realtime**   | Socket.io 4 (WebSocket + polling fallback)                 |
| **Cache**      | ioredis → Upstash Redis (OTPs, driver locations)           |
| **Storage**    | AWS S3 (presigned PUT URLs for document uploads)           |
| **Payments**   | Razorpay (order creation + webhook verification)           |
| **Push**       | Firebase Admin SDK (FCM push notifications)                |
| **Validation** | Zod schemas                                                |
| **Logging**    | Pino + pino-pretty                                         |
| **Maps**       | Google Maps Distance Matrix API (trip distance estimation) |

### Mobile

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| **Framework**    | Expo SDK + expo-router (file-based routing)       |
| **Styling**      | NativeWind (TailwindCSS for React Native)         |
| **State**        | Zustand stores                                    |
| **HTTP**         | Axios with interceptor-based silent token refresh |
| **Realtime**     | socket.io-client                                  |
| **Animations**   | react-native-reanimated (FadeInDown, spring)      |
| **Maps**         | MapmyIndia / Mappls SDK                           |
| **Secure Store** | expo-secure-store (tokens, deviceId)              |

---

## 4. Database Schema (Prisma)

### Enums

```
Role:            CUSTOMER | DRIVER | ADMIN
UserStatus:      ACTIVE | BANNED | PENDING
KYCStatus:       UNSUBMITTED | PENDING | VERIFIED | REJECTED
DocumentType:    AADHAAR | DRIVING_LICENSE | VEHICLE_RC | PAN | BANK_DETAILS | SELFIE
DocumentStatus:  PENDING | APPROVED | REJECTED
VehicleSegment:  HATCHBACK | SEDAN | MINI_SUV | SUV | TEMPO
TripType:        ONE_WAY | ROUND_TRIP
TripStatus:      PENDING_PAYMENT | CONFIRMED | DRIVER_ASSIGNED | ACTIVE | COMPLETED | CANCELLED
PaymentStatus:   PENDING | PAID | FAILED | REFUNDED | PARTIAL_REFUND
PaymentMethod:   UPI | CARD | WALLET | CASH
PackageCategory: BEACH | HILLS | CITYBREAK | WILD
BookingStatus:   PENDING | CONFIRMED | CANCELLED | COMPLETED
ExtraChargeType: EXTRA_KM | EXTRA_HOURS | FUEL | DAMAGE | DRIVER_ADDON | OTHER
```

### Core Models

```
User
  ├── id, phone (unique), name?, email? (unique), password? (admin only)
  ├── role (CUSTOMER | DRIVER | ADMIN), status, profileComplete
  ├── fcmToken, aadhaarNumber, aadhaarVerified
  ├── ID Verification: idProofType, idProofFront (S3 URL), idProofBack (S3 URL)
  │                    idVerified, idVerifiedAt, idVerifiedBy, idSubmittedAt
  ├── → RefreshToken[] (multi-device JWT rotation)
  ├── → DriverProfile? (1:1 if role=DRIVER)
  ├── → Trip[] (as customer), PackageBooking[], Rental[], Notification[]
  └── createdAt, updatedAt

DriverProfile
  ├── id, userId (unique → User)
  ├── rating, totalTrips, totalEarnings, isOnline, isAvailable, strikes
  ├── currentLat?, currentLng?, lastLocationAt?
  ├── kycStatus (UNSUBMITTED → PENDING → VERIFIED/REJECTED)
  ├── segment (VehicleSegment?)
  ├── Bank: bankAccountNumber, bankIFSC, bankAccountName, bankVerified
  ├── → Vehicle? (1:1)
  ├── → Document[] (driver KYC docs)
  ├── → Trip[] (as driver)
  └── Indexed: [isOnline, isAvailable, kycStatus]

Vehicle
  ├── id, driverId (unique → DriverProfile)
  ├── make, model, color, year, plateNumber (unique), registrationNumber (unique)
  ├── segment, maxCapacity, perHeadExtraCharge
  ├── insuranceExpiry?, fitnessExpiry?
  ├── Rental fields: isAvailableForRental, rentalPricePerDay, rentalKmLimit, rentalExtraKmCharge
  └── → Rental[]

Document (Driver KYC Documents)
  ├── id, driverId → DriverProfile
  ├── type (DocumentType), fileUrl (S3 URL)
  ├── status (PENDING | APPROVED | REJECTED), rejectReason?
  ├── verifiedAt?, verifiedBy? (admin userId)
  └── Unique constraint: [driverId, type] — one doc per type per driver
      Indexed: [driverId], [status]

Trip
  ├── id (uuid), userId → User, driverId? → DriverProfile
  ├── tripType, status, startDate, endDate, passengerCount, vehicleSegment
  ├── Financials: totalFare, upfrontPercentage (25|50|100), amountPaidUpfront, balanceRemaining
  ├── startOtp (4-digit, generated on creation)
  ├── → Waypoint[], Payment?
  └── createdAt, updatedAt

Waypoint: id, tripId, address, lat, lng, orderIndex (0 = Pickup, last = Drop)
Payment:  id, tripId?|packageId?|rentalId? (polymorphic), razorpayOrderId, status, amount
Package:  id, title, subtitle, description, category, price, durationDays, maxPeople, inclusions[], exclusions[], itinerary (JSON), imageUrls[]
PackageBooking: id, userId, packageId, travelDate, numPeople, pricing, status, payment
Rental:   id, userId, vehicleId, dates, pricing, withDriver, prepaidAmount, extraCharges[], status
CustomPlan: id, submittedBy, submittedByRole, pickupLocation, destinations[], numberOfTravellers, budgetMin, budgetMax, carType, hotelRequired, additionalNotes, status, quotedAmount, assignedDriverId, platformCommission, driverEarning
Notification: id, userId, title, body, data (JSON), read
```

---

## 5. Authentication Flow

1. **Send OTP**: `POST /api/auth/send-otp` → `{ phone, role? }` → MSG91 OTP (or dev bypass)
2. **Verify OTP**: `POST /api/auth/verify-otp` → `{ phone, otp, deviceId, deviceName, role }` → Creates/finds user, returns `{ accessToken, refreshToken, user }`
3. **Token refresh**: `POST /api/auth/refresh` → Rotates refresh token (single-use, per-device)
4. **Hardcoded admin**: Phone `+919999999999` always gets `ADMIN` role
5. **JWT payload**: `{ userId, role, phone }`
6. **Guards**: `authGuard` (JWT verify) → `roleGuard(Role.ADMIN)` for admin routes

---

## 6. Admin API Surface (existing)

All routes prefixed with `/api/admin/`, protected by `[authGuard, roleGuard(ADMIN)]`.

### Customer ID Verification

| Method | Endpoint                     | Description                                 |
| ------ | ---------------------------- | ------------------------------------------- |
| GET    | `/id-proofs/queue`           | Customers with submitted but unverified IDs |
| PUT    | `/id-proofs/:userId/approve` | Approve customer ID                         |
| PUT    | `/id-proofs/:userId/reject`  | Reject customer ID (requires `reason`)      |

### Driver KYC Verification

| Method | Endpoint                             | Description                                              |
| ------ | ------------------------------------ | -------------------------------------------------------- |
| GET    | `/kyc/queue`                         | Drivers with `kycStatus = PENDING`                       |
| GET    | `/kyc/:driverId`                     | Full KYC details + all documents                         |
| PUT    | `/kyc/:driverId/docs/:docId/approve` | Approve single document                                  |
| PUT    | `/kyc/:driverId/docs/:docId/reject`  | Reject single document (requires reason)                 |
| PUT    | `/kyc/:driverId/approve`             | Approve overall driver KYC (all 6 docs must be approved) |
| PUT    | `/kyc/:driverId/reject`              | Reject overall driver KYC                                |

### User Management

| Method | Endpoint             | Description                                                        |
| ------ | -------------------- | ------------------------------------------------------------------ |
| GET    | `/users/customers`   | Paginated customer list (`?page=&limit=&search=`)                  |
| GET    | `/users/drivers`     | Paginated driver list (includes driverProfile.kycStatus, isOnline) |
| PUT    | `/users/:userId/ban` | Toggle ban/unban                                                   |

### Dashboard & Other

| Method | Endpoint                                | Description                                                        |
| ------ | --------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/stats`                                | totalCustomers, totalDrivers, tripsToday, revenueToday, pendingKyc |
| PUT    | `/packages/bookings/:bookingId/approve` | Confirm a package booking                                          |

### Custom Plans

| Method | Endpoint                          | Description                                                      |
| ------ | --------------------------------- | ---------------------------------------------------------------- |
| GET    | `/custom-plans`                   | Paginated list of all custom plans                               |
| GET    | `/custom-plans/:id`               | Single custom plan details                                       |
| PUT    | `/custom-plans/:id`               | Update custom plan status, notes, quote                          |
| POST   | `/custom-plans/:id/assign-driver` | Assign a driver to an accepted custom plan with commission setup |
| GET    | `/available-drivers`              | Get all verified drivers for assignment                          |

---

## 7. Socket.io Events

### Client → Server

| Event               | Payload                  | Who    | Description                                |
| ------------------- | ------------------------ | ------ | ------------------------------------------ |
| `driver:online`     | (none)                   | Driver | Go online, join `drivers:online` room      |
| `driver:offline`    | (none)                   | Driver | Go offline, clear location                 |
| `driver:location`   | `{ lat, lng, heading? }` | Driver | Update location (Redis + DB throttled 30s) |
| `driver:accept_job` | `{ tripId, driverId }`   | Driver | Accept a confirmed trip                    |

### Server → Client

| Event                  | Payload                         | Who      | Description                |
| ---------------------- | ------------------------------- | -------- | -------------------------- |
| `connected`            | `{ message }`                   | All      | Ack connection             |
| `trip:driver_assigned` | `{ driverId, driverName, ... }` | Customer | Driver accepted their trip |
| `trip:status_updated`  | `{ status }`                    | Customer | Trip status change         |
| `trip:driver_location` | `{ lat, lng, heading }`         | Customer | Live driver location       |
| `trip:job_available`   | `{ trip }`                      | Drivers  | New trip available         |
| `trip:job_taken`       | `{ tripId }`                    | Drivers  | Trip no longer available   |
| `admin:stats:update`   | stats data                      | Admin    | Real-time dashboard update |
| `admin:kyc:submitted`  | KYC submission data             | Admin    | New KYC submission         |
| `error`                | `{ message, event }`            | All      | Error response             |

---

## 8. Driver Location System

- **Redis**: `location:{driverId}` → `{ lat, lng, updatedAt }` with 30s TTL (auto-expires if driver stops sending)
- **DB**: `DriverProfile.currentLat/currentLng/lastLocationAt` — updated at most every 30s (throttled)
- **Live tracking**: When a driver has an active trip, their location is forwarded to the customer via `trip:driver_location`

---

## 9. Document / File Storage

- **AWS S3 bucket**: `atfacility-docs` (region: `ap-south-1`)
- **Upload flow**: Backend generates presigned PUT URL → client uploads directly to S3 → backend stores the public S3 URL in DB
- **Driver KYC docs**: `s3://atfacility-docs/kyc/{driverId}/{DOCUMENT_TYPE}-{timestamp}.jpg`
- **Customer ID proofs**: `s3://atfacility-docs/customer-ids/{userId}/{idProofType}/{side}-{timestamp}.jpg`
- **Required driver docs** (6 total): AADHAAR, DRIVING_LICENSE, VEHICLE_RC, PAN, BANK_DETAILS, SELFIE

---

## 10. Pricing System

### Per-KM rates (single-day trips, 250km minimum)

| Segment   | Rate/km | Flat rate/day (multi-day) |
| --------- | ------- | ------------------------- |
| HATCHBACK | ₹11     | ₹3,500                    |
| SEDAN     | ₹12     | ₹3,500                    |
| MINI_SUV  | ₹14     | ₹4,000                    |
| SUV       | ₹16     | ₹5,000                    |
| TEMPO     | ₹25     | ₹6,000                    |

- **Driver allowance**: ₹500 for trips > 300km
- **Payment tiers**: 25%, 50%, or 100% upfront
- **Distance**: Google Maps Distance Matrix API (fallback: Haversine approximation)

---

## 11. Mobile App (Expo) — Current Admin Screens

### Tabs (in `app/(admin)/`)

| Screen       | File            | Status                                                                                                                                 |
| ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard    | `dashboard.tsx` | Fetches `/api/admin/stats`, shows stat grid + bar chart + quick actions. Activity feed endpoint (`/api/admin/activity`) not yet built. |
| Users        | `users.tsx`     | **Hardcoded mock data** — not connected to backend API. Has customer/driver tabs, search, detail modal, ban toggle.                    |
| Verify (KYC) | `verify.tsx`    | Connected to backend. Shows KYC queue, doc review with approve/reject per doc, final driver approve/reject.                            |

### Key Observations

- **Users screen uses hardcoded data** — needs to be wired to `GET /api/admin/users/customers` and `GET /api/admin/users/drivers`
- **Customer ID verification** is not surfaced in the mobile admin at all (only driver KYC verify exists)
- **No map screen** exists yet for viewing active drivers
- **No lazy loading** — all data is fetched eagerly in one go
- **No skeleton loaders** — only `ActivityIndicator` spinners are used
- **No document image preview** — "View Document ↗" in verify.tsx is just text, doesn't open the image

---

## 12. API Response Format

All backend endpoints return a consistent envelope:

```json
{
  "success": true|false,
  "message": "Description",
  "data": <payload> | null,
  "errors": null  // only on error responses
}
```

Paginated responses include:

```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "hasMore": true
}
```

---

## 13. Environment Variables (Backend)

| Variable              | Purpose                              |
| --------------------- | ------------------------------------ |
| `DATABASE_URL`        | Supabase PostgreSQL (PgBouncer)      |
| `DIRECT_URL`          | Direct PG connection (migrations)    |
| `REDIS_URL`           | Upstash Redis (TLS)                  |
| `JWT_ACCESS_SECRET`   | Access token signing (15m expiry)    |
| `JWT_REFRESH_SECRET`  | Refresh token signing (30d expiry)   |
| `AWS_*`               | S3 credentials + bucket + region     |
| `MSG91_*`             | OTP SMS provider                     |
| `RAZORPAY_*`          | Payment gateway                      |
| `FIREBASE_*`          | FCM push notifications               |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix API                  |
| `MAPPLS_*`            | MapmyIndia API keys (used in mobile) |

---

## 14. Key Patterns & Conventions

### Backend

- **Module structure**: Each feature = `{name}.routes.ts` → `{name}.controller.ts` → `{name}.service.ts`
- **Guards**: `preHandler: [authGuard, roleGuard(Role.ADMIN)]` for protected routes
- **Response helpers**: Always use `sendSuccess()`, `sendError()`, etc. from `shared/utils/response.ts`
- **Error handling**: Controller catches errors, returns via `sendError(reply, err.message)`
- **Prisma import**: Use `import prisma from "../../shared/db/prisma"` (default export) or `import { prisma }` (named)
- **Socket**: Use `safeSocketHandler()` wrapper for all socket event handlers

### Mobile

- **API calls**: Use `api` instance from `utils/api.ts` (auto-attaches JWT, handles 401 refresh)
- **Animations**: `FadeInDown.delay(n).springify()` from `react-native-reanimated`
- **Colors**: Brand primary `#1B4F8A`, sub text `#9CA3AF`, borders `#DDE3ED`, input bg `#EEF2F7`
- **State**: Zustand stores in `store/` directory

---

## 15. What Needs to Be Built (Admin Panel Improvements)

### Missing Backend Endpoints

1. `GET /api/admin/activity` — Recent activity feed (called by dashboard but not implemented)
2. `GET /api/admin/drivers/active-locations` — All online drivers with their current locations (for map screen)
3. Presigned GET URLs for viewing uploaded documents (currently only stores public S3 URLs)

### Missing Frontend Screens

1. **Live Map Screen** — Show all active/online drivers on a map in real-time
2. **Customer ID Verification Screen** — Surface `GET /api/admin/id-proofs/queue` with document image viewing

### Frontend Fixes Needed

1. **Users screen** — Wire to real backend API instead of hardcoded mock data
2. **Document lazy loading** — Load document images on-demand with lazy loading
3. **Skeleton loaders** — Replace `ActivityIndicator` with skeleton placeholders
4. **Document image viewer** — Actually display uploaded S3 document images (with zoom/pan)

---

## 16. Running the Project

```bash
# Install root deps (husky, prettier)
npm install

# Start backend
npm run backend          # or: cd backend && npm run dev
# → http://localhost:4000

# Start mobile
npm run mobile           # or: cd apps/mobile && npx expo start

# Database
cd backend
npx prisma migrate dev   # Apply migrations
npx prisma db seed       # Seed admin + packages
npx prisma studio        # Visual DB browser
```
