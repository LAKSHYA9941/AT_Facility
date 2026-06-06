// backend/src/shared/middleware/rate-limiters.ts
// Strict per-endpoint rate limiters used as preHandler hooks.
//
// Usage in auth.routes.ts:
//   import { otpSendLimiter, otpVerifyLimiter } from "../../shared/middleware/rate-limiters";
//   app.post("/send-otp",   { preHandler: [otpSendLimiter]   }, sendOtpHandler);
//   app.post("/verify-otp", { preHandler: [otpVerifyLimiter] }, verifyOtpHandler);
//
// Usage in trips.routes.ts:
//   import { tripCreateLimiter } from "../../shared/middleware/rate-limiters";
//   app.post("/", { preHandler: [authGuard, tripCreateLimiter] }, createTrip);

import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { FastifyRequest, FastifyReply } from "fastify";
import { redis } from "../redis/redis";

// ── OTP send: 5 requests per hour per phone ──────────────────────────────────
// This is a preHandler, not a plugin — it checks Redis manually for fine-grained
// per-phone limiting (not per-IP, since multiple users share IPs on mobile networks).

export async function otpSendLimiter(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as { phone?: string };
  const phone = body?.phone;

  if (!phone) return; // Let the controller handle missing phone validation

  const key = `ratelimit:otp:send:${phone}`;
  const count = await redis.incr(key);

  if (count === 1) {
    // First request — set 1 hour TTL
    await redis.expire(key, 3600);
  }

  if (count > 5) {
    const ttl = await redis.ttl(key);
    return reply.code(429).send({
      success: false,
      message: `Too many OTP requests for this number. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      data: null,
    });
  }
}

// ── OTP verify: 10 attempts per hour per phone ───────────────────────────────

export async function otpVerifyLimiter(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const body = req.body as { phone?: string };
  const phone = body?.phone;

  if (!phone) return;

  const key = `ratelimit:otp:verify:${phone}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600);
  }

  if (count > 10) {
    const ttl = await redis.ttl(key);
    return reply.code(429).send({
      success: false,
      message: `Too many verification attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      data: null,
    });
  }
}

// ── Trip creation: 20 per minute per user ────────────────────────────────────

export async function tripCreateLimiter(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const user = req.user as { userId?: string };
  const key = `ratelimit:trip:create:${user?.userId ?? req.ip}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 20) {
    return reply.code(429).send({
      success: false,
      message: "Too many trip requests. Please slow down.",
      data: null,
    });
  }
}
