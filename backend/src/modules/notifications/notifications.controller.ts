import { FastifyRequest, FastifyReply } from "fastify";
import { notificationsService } from "./notifications.service";
import { JWTPayload } from "../../shared/types";
import { sendSuccess, sendError } from "../../shared/utils/response";

export class NotificationsController {
  registerToken = async (
    req: FastifyRequest<{ Body: { token: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { token } = req.body;
      if (!token) return sendError(reply, "Token is required");
      return sendSuccess(reply, null, "Token registered successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getMyNotifications = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await notificationsService.getMyNotifications(user.userId);
      return sendSuccess(reply, data, "Notifications retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  markAllAsRead = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      await notificationsService.markAllAsRead(user.userId);
      return sendSuccess(reply, null, "Notifications marked as read");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
