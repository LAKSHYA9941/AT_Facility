import { FastifyInstance } from "fastify";
import { PaymentsController } from "./payments.controller";
import { authGuard } from "../../shared/middleware/auth.guard";

export async function paymentsRoutes(fastify: FastifyInstance) {
  const paymentsController = new PaymentsController();

  // Creating and verifying orders should be protected routes
  fastify.post(
    "/create-order",
    { preHandler: [authGuard] },
    paymentsController.createOrder as any,
  );

  fastify.post(
    "/verify",
    { preHandler: [authGuard] },
    paymentsController.verifySignature as any,
  );

  // Webhook is called directly by Razorpay's servers (unauthenticated)
  fastify.post(
    "/bypass-verify",
    { preHandler: [authGuard] },
    paymentsController.bypassVerify as any,
  );
  fastify.post(
    "/bypass-balance",
    { preHandler: [authGuard] },
    paymentsController.bypassBalance as any,
  );

  fastify.post("/webhook", paymentsController.handleWebhook);
}
