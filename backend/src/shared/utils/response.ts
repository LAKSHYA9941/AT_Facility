import { FastifyReply } from "fastify";

export const sendSuccess = <T>(
  reply: FastifyReply,
  data: T,
  message = "Success",
  statusCode = 200,
) => {
  return reply.status(statusCode).send({
    success: true,
    message,
    data,
  });
};

export const sendCreated = <T>(
  reply: FastifyReply,
  data: T,
  message = "Created successfully",
) => {
  return reply.status(201).send({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  reply: FastifyReply,
  message: string,
  statusCode = 400,
  errors: unknown = null,
) => {
  // Sanitize internal errors (like Prisma stack traces) so they don't leak to the UI
  const safeMessage =
    message &&
    (message.includes("prisma") ||
      message.includes("Invalid `") ||
      message.length > 200)
      ? "Something went wrong. Please try again."
      : message;

  return reply.status(statusCode).send({
    success: false,
    message: safeMessage,
    errors,
    data: null,
  });
};

export const sendUnauthorized = (
  reply: FastifyReply,
  message = "Unauthorized",
) => {
  return reply.status(401).send({
    success: false,
    message,
    data: null,
  });
};

export const sendForbidden = (reply: FastifyReply, message = "Forbidden") => {
  return reply.status(403).send({
    success: false,
    message,
    data: null,
  });
};

export const sendNotFound = (reply: FastifyReply, message = "Not found") => {
  return reply.status(404).send({
    success: false,
    message,
    data: null,
  });
};
