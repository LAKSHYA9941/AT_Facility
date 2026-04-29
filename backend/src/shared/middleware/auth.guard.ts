import { FastifyReply, FastifyRequest } from "fastify";
import { sendUnauthorized } from "../utils/response";

export const authGuard = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
  } catch {
    return sendUnauthorized(reply, "Invalid or expired token");
  }
};
