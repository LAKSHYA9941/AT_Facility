// backend/src/app.ts
// Fastify app setup — rate limiting, security headers, CORS, JWT, logging.
//
// npm installs needed:
//   npm install @fastify/rate-limit @fastify/helmet
//   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner   (if not already)

import Fastify, { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { registerRoutes } from "./routes";
import { errorHandler } from "./shared/middleware/error.handler";
import { redis } from "./shared/redis/redis";
import { logger } from "./shared/logger/logger";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use Pino separately
    trustProxy: true, // Required behind Cloud Run / load balancer
    genReqId: () => crypto.randomUUID(),
  });

  // ── Zod Type Provider ────────────────────────────────────────────────────
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Security headers ─────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false, // Needed for S3 presigned URLs in browser
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = [
        "https://atfacility.com",
        "https://admin.atfacility.com",
      ];
      // Allow all in dev/staging; restrict in production
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  // ── JWT ───────────────────────────────────────────────────────────────────
  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET!,
  });

  // ── Multipart (file uploads) ──────────────────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // ── Global rate limit ─────────────────────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    redis, // Use Redis for distributed rate limiting across Cloud Run instances
    keyGenerator: (req) => {
      // Prefer userId from JWT if available, otherwise use IP
      try {
        const user = req.user as any;
        if (user?.userId) return `user:${user.userId}`;
      } catch {}
      return req.ip;
    },
    errorResponseBuilder: (_req, context) => ({
      success: false,
      message: `Too many requests. Please wait ${Math.ceil(context.ttl / 1000)}s before trying again.`,
      data: null,
    }),
  });

  // ── Route-specific stricter limits ────────────────────────────────────────
  // These are applied as preHandler hooks in the relevant route files.
  // See auth.routes.ts for the OTP-specific limiter pattern.
  //
  // Pattern to add in auth.routes.ts:
  //
  //   import { otpRateLimiter } from "../../shared/middleware/rate-limiters";
  //   app.post("/send-otp", { preHandler: [otpRateLimiter] }, sendOtp);

  // ── Request logging (Pino) ────────────────────────────────────────────────

  app.addHook("onRequest", async (req) => {
    req.log = logger.child({ reqId: req.id, method: req.method, url: req.url });
  });

  app.addHook("onResponse", async (req, reply) => {
    logger.info({
      reqId: req.id,
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      responseTime: Math.round(reply.elapsedTime),
      userId: (req.user as any)?.userId,
    });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Routes ────────────────────────────────────────────────────────────────
  await registerRoutes(app);

  return app;
}
