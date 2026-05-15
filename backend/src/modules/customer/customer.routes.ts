import { FastifyInstance } from "fastify";
import { customerController } from "./customer.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { uploadIdProofSchema, confirmIdProofSchema } from "./customer.schema";

export const customerRoutes = async (app: FastifyInstance) => {
  // Protected routes — need valid access token
  app.post(
    "/id-proof/upload",
    {
      schema: { body: uploadIdProofSchema.body },
      preHandler: [authGuard],
    },
    customerController.uploadIdProof,
  );

  app.put(
    "/id-proof/confirm",
    {
      schema: { body: confirmIdProofSchema.body },
      preHandler: [authGuard],
    },
    customerController.confirmIdProof,
  );

  app.get(
    "/id-proof/status",
    { preHandler: [authGuard] },
    customerController.getIdProofStatus,
  );
};
