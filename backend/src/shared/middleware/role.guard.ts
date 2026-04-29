import { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "../types/enums";
import { sendForbidden } from "../utils/response";
import { JWTPayload } from "../types";

export const roleGuard = (...roles: Role[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JWTPayload;
    if (!user || !roles.includes(user.role)) {
      return sendForbidden(
        reply,
        "You do not have permission to access this resource",
      );
    }
  };
};
