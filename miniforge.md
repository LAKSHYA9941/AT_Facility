# MiniForge Assessment: `atfacility`

## A. CONVENTIONS

_Current architecture and toolset. Future sessions must adhere to these choices unless explicitly requested._

- **Backend Framework:** Use Fastify (not Express). Do not switch to Express.
- **Database ORM:** Use Prisma with PostgreSQL. Do not switch to raw SQL or TypeORM.
- **Mobile App:** Use React Native with Expo and NativeWind (Tailwind). Do not switch to plain React Native CLI or StyleSheet unless specified.
- **State Management:** Use Zustand (mobile). Do not switch to Redux or Context API.
- **Realtime:** Use Socket.io.
- **Validation:** Use Zod.
- **Authentication:** Use JWT via `@fastify/jwt`.
- **Cloud/Services:** AWS S3 (files), Razorpay (payments), Firebase Admin (push notifications).

## B. HARD RULES

_Constitutional rules based on your requirement for a reliable, public-facing production app that handles money._

1. **No Fallback Secrets:** Never use hardcoded fallback secrets for JWTs, API keys, or database credentials.
2. **Financial Data Integrity:** Any operations involving money (fares, payments, driver wallets) must use Prisma transactions to prevent race conditions or partial updates.
3. **Strict Boundary Validation:** All incoming data (REST endpoints AND Socket.io events) must be strictly validated against Zod schemas before any processing.
4. **Never Fail Silently:** Socket.io event errors must be emitted back to the client so the app can respond, rather than just logging to the console and hanging the mobile app.
5. **No Direct Production DB Mutation:** Never write scripts that mutate the production database without a dry-run flag and explicit logging.

## C. QUICK WINS

_Critical issues found in the codebase that should be fixed immediately._

### 1. Hardcoded Fallback Secret for JWT

**Where:** `backend/src/app.ts` (Line 34)
**Issue:** `secret: process.env.JWT_ACCESS_SECRET || "fallback_secret"` means if the env var is missing in production, anyone can forge a JWT using "fallback_secret".
**Fix:** Remove the fallback. The app should crash if the secret is missing (which is already checked at boot).

```typescript
await app.register(jwt, {
  secret: process.env.JWT_ACCESS_SECRET!,
});
```

### 2. Socket.io Event Errors Swallow Failures

**Where:** `backend/src/server.ts` (Socket handlers)
**Issue:** You are using `try/catch` in socket events, but the `catch` block only does `console.error(...)`. The mobile client receives no error response and will hang indefinitely waiting for a success state.
**Fix:** Emit an error back to the client.

```typescript
catch (err: any) {
  console.error("Driver online error:", err);
  socket.emit(SOCKET_EVENTS.ERROR, { message: err.message || "An error occurred" });
}
```

### 3. Zod Validation is Not Integrated with Fastify

**Where:** `backend/src/modules/auth/auth.routes.ts`
**Issue:** You are passing Zod schemas to `{ schema: { body: myZodSchema } }`. Fastify natively expects JSON Schema, not Zod. Without a type provider plugin, this validation is likely failing or being ignored, allowing invalid data through.
**Fix:** Install `fastify-type-provider-zod` and set the validator compiler in `app.ts`.

### 4. Unvalidated Socket.io Payloads

**Where:** `backend/src/server.ts` (e.g., `SOCKET_EVENTS.DRIVER_LOCATION`)
**Issue:** You accept `{ lat: number, lng: number }` but never validate it at runtime. A malicious client could send string payloads or missing data, causing database query failures or server crashes.
**Fix:** Create Zod schemas for socket payloads and parse them inside the `socket.on` handler before processing.

### 5. `console.log` as the Logging Strategy

**Where:** Throughout `backend/src` (especially `server.ts` and `trips.service.ts`)
**Issue:** `console.log` blocks the event loop in Node.js when outputting heavily, and provides no log levels or structured JSON (which is necessary for production monitoring).
**Fix:** Fastify has a highly optimized built-in logger (`Pino`). Replace `console.log` with `app.log.info()` and `app.log.error()`.

## D. RISK ASSESSMENT

**RED**

**Reasoning:** Since this app handles financial transactions, driver payouts, and will be public-facing in production, the current state of the backend is too fragile. The lack of proper Zod integration with Fastify means malicious users could bypass validation entirely. The socket handlers silently swallowing errors will lead to a terrible user experience (hanging apps), and hardcoded fallback secrets are a severe security risk. These must be addressed before real users or money touch this system.

## E. NEXT STEPS

_Recommended Forge practices to mature this project._

1. **Implement `fastify-type-provider-zod`:** Add this immediately so all your REST routes actually validate incoming requests using your existing Zod schemas.
2. **Add a Centralized Socket Error Handler:** Create a wrapper function for socket handlers that automatically catches errors, logs them using Pino, and emits standard error events back to the mobile app.
3. **Extract Socket Logic from `server.ts`:** `server.ts` is becoming a monolith. Move the driver, location, and trip socket event handlers into their respective feature modules (e.g., `backend/src/modules/trips/trips.gateway.ts`).
4. **Move Hardcoded Business Rules to Config:** The vehicle flat rates (3500, 4000, 5000) inside `trips.service.ts` should be moved to a configuration file or the database so pricing can be updated without deploying code.
