import prisma from "../../shared/db/prisma";

export class NotificationsService {
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        data: data ?? {},
      },
    });

    return notification;
  }

  async getMyNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export const notificationsService = new NotificationsService();
