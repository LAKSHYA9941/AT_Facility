import { FastifyInstance } from "fastify";
import { KycController } from "./kyc.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";

export async function kycRoutes(fastify: FastifyInstance) {
  const kycController = new KycController();

  // POST /api/kyc/upload/:docType — main upload endpoint (returns presigned URL + creates DB record)
  fastify.post<{
    Params: { docType: string };
    Querystring: { documentNumber?: string };
    Body: { documentNumber?: string };
  }>(
    "/upload/:docType",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    kycController.uploadDocument,
  );

  // GET /api/kyc/upload/:docType — alias for mobile clients that call via GET
  fastify.get<{
    Params: { docType: string };
    Querystring: { documentNumber?: string };
    Body: { documentNumber?: string };
  }>(
    "/upload/:docType",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    kycController.uploadDocument,
  );

  fastify.post<{
    Body: {
      name?: string;
      bankIFSC?: string;
      bankAccountName?: string;
      aadhaarNumber?: string;
      dlNumber?: string;
      rcNumber?: string;
      panNumber?: string;
    };
  }>(
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
