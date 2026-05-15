import { FastifyInstance } from "fastify";
import { NotificationsController } from "./notifications.controller";
import { authGuard } from "../../shared/middleware/auth.guard";

export async function notificationsRoutes(fastify: FastifyInstance) {
  const notificationsController = new NotificationsController();
  const preHandler = { preHandler: [authGuard] };

  fastify.post<{ Body: { token: string } }>(
    "/register-token",
    preHandler,
    notificationsController.registerToken,
  );
  fastify.get("/", preHandler, notificationsController.getMyNotifications);
  fastify.put("/read-all", preHandler, notificationsController.markAllAsRead);
}
