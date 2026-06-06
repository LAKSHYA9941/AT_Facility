// backend/src/shared/middleware/error.handler.ts
// Full replacement — adds Sentry capture and structured logging.

import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import * as Sentry from "@sentry/node";
import { logger } from "../logger/logger";

export async function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = error.statusCode ?? 500;
  const userId = (req.user as any)?.userId;

  // Log all errors
  logger.error({
    reqId: req.id,
    method: req.method,
    url: req.url,
    statusCode,
    errorCode: error.code,
    message: error.message,
    userId,
    stack: statusCode === 500 ? error.stack : undefined,
  });

  // Send 500s to Sentry (not 4xx — those are user errors, not bugs)
  if (statusCode >= 500 && process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag("endpoint", `${req.method} ${req.url}`);
      scope.setTag("statusCode", String(statusCode));
      if (userId) scope.setUser({ id: userId });
      Sentry.captureException(error);
    });
  }

  // Zod validation errors — give the client a useful message
  if (error.code === "FST_ERR_VALIDATION" || error.validation) {
    return reply.code(400).send({
      success: false,
      message: "Validation error",
      errors: error.validation ?? [{ message: error.message }],
      data: null,
    });
  }

  // JWT errors
  if (
    error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
    error.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED"
  ) {
    return reply.code(401).send({
      success: false,
      message: "Unauthorised",
      data: null,
    });
  }

  // Rate limit (from @fastify/rate-limit — already formatted, just pass through)
  if (statusCode === 429) {
    return reply.code(429).send({
      success: false,
      message: error.message,
      data: null,
    });
  }

  // Everything else
  const isProd = process.env.NODE_ENV === "production";

  return reply.code(statusCode).send({
    success: false,
    message:
      statusCode === 500 && isProd ? "Internal server error" : error.message,
    data: null,
  });
}
