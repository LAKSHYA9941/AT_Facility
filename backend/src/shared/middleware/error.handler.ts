import { FastifyError, FastifyRequest, FastifyReply } from "fastify";

import { logger } from "../logger/logger";
import { AppError } from "../utils/errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function errorHandler(
  err: FastifyError | AppError | PrismaClientKnownRequestError | any,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let statusCode = 500;
  let message = "Internal server error";
  let isOperational = false;

  const isProd = process.env.NODE_ENV === "production";

  // 1. Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    isOperational = err.isOperational;
    message = isProd && !isOperational ? "Internal server error" : err.message;
  }
  // 2. Handle Prisma Client Known Request Errors
  else if (err instanceof PrismaClientKnownRequestError) {
    isOperational = true;
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        message = "A record with this value already exists.";
        break;
      case "P2025":
        statusCode = 404;
        message = "The requested record was not found.";
        break;
      case "P2003":
        statusCode = 400;
        message = "Invalid reference — related record does not exist.";
        break;
      default:
        statusCode = 500;
        message = "Database error.";
        isOperational = false;
        break;
    }
  }
  // 3. Handle Fastify errors (Zod validation, JWT, rate limit)
  else {
    statusCode = err.statusCode ?? 500;
    message = err.message;

    // Check validation error
    if (err.code === "FST_ERR_VALIDATION" || err.validation) {
      statusCode = 400;
      return reply.code(400).send({
        success: false,
        message: "Validation error",
        errors: err.validation ?? [{ message: err.message }],
        data: null,
      });
    }

    // Check JWT errors
    if (
      err.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
      err.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED"
    ) {
      statusCode = 401;
      return reply.code(401).send({
        success: false,
        message: "Unauthorised",
        data: null,
      });
    }

    // Check rate limit pass-through
    if (statusCode === 429) {
      return reply.code(429).send({
        success: false,
        message: err.message,
        data: null,
      });
    }
  }

  // Final check for production fallback message on non-operational errors
  if (statusCode === 500 && isProd) {
    message = "Internal server error";
  }

  const userId = (req.user as any)?.userId;

  // Log every error with structured logger
  logger.error({
    reqId: req.id,
    errorName: err.name || err.constructor?.name || "Error",
    statusCode,
    message: err.message || message,
    stack: statusCode === 500 ? err.stack : undefined,
    userId,
  });

  return reply.code(statusCode).send({
    success: false,
    message,
    data: null,
  });
}
