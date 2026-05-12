import { prisma } from "../../shared/db/prisma";
import {
  DocumentStatus,
  KYCStatus,
  Role,
  UserStatus,
  PaymentStatus,
} from "../../shared/types/enums";

export class AdminService {
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
        rejectReason: null, // Clear any previous reject reason
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
    const docs = await prisma.document.findMany({
      where: { driverId },
    });

    const allApproved = docs.every(
      (doc) => doc.status === DocumentStatus.APPROVED,
    );
    if (!allApproved || docs.length < 6) {
      throw new Error(
        "Cannot approve driver. Not all documents are approved or some are missing.",
      );
    }

    return prisma.driverProfile.update({
      where: { id: driverId },
      data: { kycStatus: KYCStatus.VERIFIED },
    });
  }

  async rejectDriverKyc(driverId: string) {
    return prisma.driverProfile.update({
      where: { id: driverId },
      data: { kycStatus: KYCStatus.REJECTED },
    });
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalDrivers,
      ridesTotal,
      ridesToday,
      kycPending,
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
      revenueToday: revenueQuery._sum.totalFare || 0,
      kycPending,
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
