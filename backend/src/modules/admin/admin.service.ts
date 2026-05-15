import prisma from "../../shared/db/prisma";
import { notificationsService } from "../notifications/notifications.service";
import {
  DocumentStatus,
  KYCStatus,
  Role,
  UserStatus,
  PaymentStatus,
  BookingStatus,
} from "../../shared/types/enums";

export class AdminService {
  async getCustomerIdQueue() {
    return prisma.user.findMany({
      where: {
        idSubmittedAt: { not: null },
        idVerified: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        idProofType: true,
        idProofFront: true,
        idProofBack: true,
        idSubmittedAt: true,
      },
      orderBy: { idSubmittedAt: "desc" },
    });
  }

  async approveCustomerId(userId: string, adminUserId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        idVerified: true,
        idVerifiedAt: new Date(),
        idVerifiedBy: adminUserId,
      },
    });

    await notificationsService.sendPushNotification(
      user.id,
      "ID Verified",
      "Your ID has been verified. You can now book trips.",
      { type: "ID_VERIFICATION_UPDATE", status: "VERIFIED" },
    );

    return user;
  }

  async rejectCustomerId(userId: string, reason: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        idVerified: false,
        idProofFront: null,
        idProofBack: null,
        idSubmittedAt: null,
      },
    });

    await notificationsService.sendPushNotification(
      user.id,
      "ID Verification Failed",
      "Your ID verification failed. Please resubmit. Reason: " + reason,
      { type: "ID_VERIFICATION_UPDATE", status: "REJECTED", reason },
    );

    return user;
  }

  async getKycQueue() {
    return prisma.driverProfile.findMany({
      where: { kycStatus: KYCStatus.PENDING },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        documents: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getKycDetails(driverId: string) {
    return prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        documents: true,
      },
    });
  }

  async approveDocument(driverId: string, docId: string, adminUserId: string) {
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc || doc.driverId !== driverId) {
      throw new Error("Document not found for this driver");
    }

    return prisma.document.update({
      where: { id: docId },
      data: {
        status: DocumentStatus.APPROVED,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        rejectReason: null,
      },
    });
  }

  async rejectDocument(driverId: string, docId: string, rejectReason: string) {
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc || doc.driverId !== driverId) {
      throw new Error("Document not found for this driver");
    }

    return prisma.document.update({
      where: { id: docId },
      data: {
        status: DocumentStatus.REJECTED,
        rejectReason,
      },
    });
  }

  async approveDriverKyc(driverId: string) {
    const docs = await prisma.document.findMany({ where: { driverId } });

    const allApproved = docs.every(
      (doc) => doc.status === DocumentStatus.APPROVED,
    );
    if (!allApproved || docs.length < 6) {
      throw new Error(
        "Cannot approve driver. Not all documents are approved or some are missing.",
      );
    }

    const updated = await prisma.driverProfile.update({
      where: { id: driverId },
      data: { kycStatus: KYCStatus.VERIFIED },
    });

    await notificationsService.sendPushNotification(
      updated.userId,
      "KYC Approved",
      "Your documents have been verified. You can now accept rides!",
      { type: "KYC_UPDATE", status: "VERIFIED" },
    );

    return updated;
  }

  async rejectDriverKyc(driverId: string) {
    const updated = await prisma.driverProfile.update({
      where: { id: driverId },
      data: { kycStatus: KYCStatus.REJECTED },
    });

    await notificationsService.sendPushNotification(
      updated.userId,
      "KYC Rejected",
      "Your documents were rejected. Please check the app and upload them again.",
      { type: "KYC_UPDATE", status: "REJECTED" },
    );

    return updated;
  }

  async approvePackageBooking(bookingId: string) {
    const updated = await prisma.packageBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    await notificationsService.sendPushNotification(
      updated.userId,
      "Package Booking Confirmed",
      "Your package booking has been confirmed! Get ready for your trip.",
      { type: "PACKAGE_UPDATE", bookingId: updated.id, status: "CONFIRMED" },
    );

    return updated;
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalDrivers,
      ridesTotal,
      ridesToday,
      pendingKyc,
      revenueQuery,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.user.count({ where: { role: Role.DRIVER } }),
      prisma.ride.count(),
      prisma.ride.count({ where: { createdAt: { gte: today } } }),
      prisma.driverProfile.count({ where: { kycStatus: KYCStatus.PENDING } }),
      prisma.ride.aggregate({
        where: { createdAt: { gte: today }, paymentStatus: PaymentStatus.PAID },
        _sum: { totalFare: true },
      }),
    ]);

    return {
      totalCustomers,
      totalDrivers,
      ridesTotal,
      ridesToday,
      revenueToday: revenueQuery._sum.totalFare ?? 0,
      pendingKyc,
    };
  }

  async getCustomers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { role: Role.CUSTOMER };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async getDrivers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { role: Role.DRIVER };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
          driverProfile: {
            select: { id: true, kycStatus: true, isOnline: true },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async toggleUserBan(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const newStatus =
      user.status === UserStatus.BANNED ? UserStatus.ACTIVE : UserStatus.BANNED;

    return prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: { id: true, name: true, status: true },
    });
  }
}
