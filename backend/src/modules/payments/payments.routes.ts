import { FastifyInstance } from "fastify";
import { PaymentsController } from "./payments.controller";
import { authGuard } from "../../shared/middleware/auth.guard";

export async function paymentsRoutes(fastify: FastifyInstance): Promise<void> {
  const paymentsController = new PaymentsController();

  // Upfront Payment routes
  fastify.post(
    "/create-order",
    { preHandler: [authGuard] },
    paymentsController.createOrder,
  );

  fastify.post(
    "/verify",
    { preHandler: [authGuard] },
    paymentsController.verifySignature,
  );

  fastify.post(
    "/bypass-verify",
    { preHandler: [authGuard] },
    paymentsController.bypassVerify,
  );

  // Balance Payment routes
  fastify.post(
    "/create-balance-order",
    { preHandler: [authGuard] },
    paymentsController.createBalanceOrderHandler,
  );

  fastify.post(
    "/verify-balance",
    { preHandler: [authGuard] },
    paymentsController.verifyBalanceSignatureHandler,
  );

  // Custom Plan Payment routes
  fastify.post(
    "/create-custom-plan-order",
    { preHandler: [authGuard] },
    paymentsController.createCustomPlanOrder,
  );

  fastify.post(
    "/verify-custom-plan",
    { preHandler: [authGuard] },
    paymentsController.verifyCustomPlanPayment,
  );

  // Webhook is called directly by Razorpay's servers (unauthenticated)
  fastify.post("/webhook", paymentsController.handleWebhook);
}
