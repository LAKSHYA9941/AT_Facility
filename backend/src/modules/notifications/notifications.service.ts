import prisma from "../../shared/db/prisma";
import * as admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Fixes potential newline parsing bugs
  }),
});

export class NotificationsService {
  async registerToken(userId: string, token: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  }

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      try {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: data ? { payload: JSON.stringify(data) } : undefined,
        });
      } catch (error) {
        console.error(
          `Failed to send push notification to user ${userId}:`,
          error,
        );
      }
    }

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
