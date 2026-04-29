import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  console.error(`[ERROR] ${request.method} ${request.url}:`, error);

  // Prisma errors
  if (error.message?.includes("Unique constraint")) {
    return reply.status(409).send({
      success: false,
      message: "Resource already exists",
      data: null,
    });
  }

  if (
    error.message?.includes("Record to update not found") ||
    error.message?.includes("Record to delete not found")
  ) {
    return reply.status(404).send({
      success: false,
      message: "Resource not found",
      data: null,
    });
  }

  // Validation errors
  if (error.statusCode === 400) {
    return reply.status(400).send({
      success: false,
      message: error.message || "Validation error",
      data: null,
    });
  }

  // JWT errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      success: false,
      message: "Unauthorized",
      data: null,
    });
  }

  // Default
  return reply.status(500).send({
    success: false,
    message: "Internal server error",
    data: null,
  });
};
