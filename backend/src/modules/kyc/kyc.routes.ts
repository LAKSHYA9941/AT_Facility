import { FastifyInstance } from "fastify";
import { KycController } from "./kyc.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";

export async function kycRoutes(fastify: FastifyInstance) {
  const kycController = new KycController();

  fastify.post<{ Params: { docType: string } }>(
    "/upload/:docType",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    kycController.uploadDocument,
  );

  fastify.post(
    "/submit",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    kycController.submitKyc,
  );

  fastify.get(
    "/status",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    kycController.getStatus,
  );
}
