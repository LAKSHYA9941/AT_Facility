import prisma from "../../shared/db/prisma";
import { notificationsService } from "../notifications/notifications.service";
import {
  DocumentStatus,
  KYCStatus,
  Role,
  UserStatus,
  PaymentStatus,
  BookingStatus,
  TripStatus,
} from "../../shared/types/enums";
import { LocationRedis } from "../../shared/redis/redis";
import { getPresignedGetUrl } from "../../shared/storage/s3";

export class AdminService {
  // ── Customer ID Proof Queue ──────────────────────────────────

  async getCustomerIdQueue() {
    const users = await prisma.user.findMany({
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

    return Promise.all(
      users.map(async (u) => ({
        ...u,
        idProofFront: u.idProofFront
          ? await getPresignedGetUrl(u.idProofFront, 3600)
          : null,
        idProofBack: u.idProofBack
          ? await getPresignedGetUrl(u.idProofBack, 3600)
          : null,
      })),
    );
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

  // ── Driver KYC ──────────────────────────────────────────────

  async getKycQueue() {
    const profiles = await prisma.driverProfile.findMany({
      where: { kycStatus: KYCStatus.PENDING },
      include: {
        user: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return profiles;
  }

  async getKycDetails(driverId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { name: true, phone: true, email: true } },
      },
    });

    if (!profile) return null;

    // Helper to generate presigned URLs if they exist
    const signUrl = async (url: string | null) => {
      return url ? await getPresignedGetUrl(url, 3600) : null;
    };

    return {
      ...profile,
      aadhaarUrl: await signUrl(profile.aadhaarUrl),
      dlUrl: await signUrl(profile.dlUrl),
      rcUrl: await signUrl(profile.rcUrl),
      panUrl: await signUrl(profile.panUrl),
      bankDetailsUrl: await signUrl(profile.bankDetailsUrl),
      selfieUrl: await signUrl(profile.selfieUrl),
    };
  }

  async approveDriverKyc(driverId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) throw new Error("Profile not found");

    if (
      !profile.aadhaarUrl ||
      !profile.dlUrl ||
      !profile.rcUrl ||
      !profile.panUrl ||
      !profile.bankDetailsUrl ||
      !profile.selfieUrl
    ) {
      throw new Error("Cannot approve driver. Some documents are missing.");
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

  // ── Packages ──────────────────────────────────────────────

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

  // ── Dashboard Stats ──────────────────────────────────────

  async getAvailableDrivers() {
    return prisma.driverProfile.findMany({
      where: {
        kycStatus: KYCStatus.VERIFIED,
      },
      select: {
        id: true,
        isOnline: true,
        isAvailable: true,
        rating: true,
        totalTrips: true,
        segment: true,
        user: { select: { name: true, phone: true } },
        vehicle: {
          select: {
            make: true,
            model: true,
            color: true,
            plateNumber: true,
            segment: true,
          },
        },
      },
      orderBy: [
        { isOnline: "desc" },
        { isAvailable: "desc" },
        { rating: "desc" },
      ],
    });
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalDrivers,
      tripsTotal,
      tripsToday,
      pendingKyc,
      pendingIdProofs,
      revenueQuery,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.user.count({ where: { role: Role.DRIVER } }),
      prisma.trip.count(),
      prisma.trip.count({ where: { createdAt: { gte: today } } }),
      prisma.driverProfile.count({ where: { kycStatus: KYCStatus.PENDING } }),
      prisma.user.count({
        where: { idSubmittedAt: { not: null }, idVerified: false },
      }),
      prisma.trip.aggregate({
        where: { createdAt: { gte: today }, status: "COMPLETED" },
        _sum: { totalFare: true },
      }),
    ]);

    return {
      totalCustomers,
      totalDrivers,
      tripsTotal,
      tripsToday,
      revenueToday: revenueQuery._sum.totalFare ?? 0,
      pendingKyc,
      pendingIdProofs,
    };
  }

  // ── User Management (Enriched) ──────────────────────────

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
          idProofType: true,
          idVerified: true,
          idSubmittedAt: true,
          profileComplete: true,
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
            select: {
              id: true,
              kycStatus: true,
              isOnline: true,
              isAvailable: true,
              rating: true,
              totalTrips: true,
              totalEarnings: true,
              segment: true,
              strikes: true,
              vehicle: {
                select: {
                  make: true,
                  model: true,
                  plateNumber: true,
                  segment: true,
                  color: true,
                },
              },
            },
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

  // ── Active Driver Locations (for Map) ──────────────────

  async getActiveDriverLocations() {
    const onlineDrivers = await prisma.driverProfile.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        userId: true,
        currentLat: true,
        currentLng: true,
        lastLocationAt: true,
        segment: true,
        isAvailable: true,
        user: {
          select: { name: true, phone: true },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            plateNumber: true,
            color: true,
            segment: true,
          },
        },
      },
    });

    // Enrich with Redis live locations (fresher than DB)
    const enriched = await Promise.all(
      onlineDrivers.map(async (driver) => {
        const redisLoc = await LocationRedis.get(driver.id);
        return {
          driverId: driver.id,
          userId: driver.userId,
          name: driver.user.name,
          phone: driver.user.phone,
          lat: redisLoc?.lat ?? driver.currentLat,
          lng: redisLoc?.lng ?? driver.currentLng,
          lastLocationAt: redisLoc?.updatedAt
            ? new Date(redisLoc.updatedAt)
            : driver.lastLocationAt,
          segment: driver.vehicle?.segment ?? driver.segment,
          isAvailable: driver.isAvailable,
          vehicle: driver.vehicle
            ? {
                make: driver.vehicle.make,
                model: driver.vehicle.model,
                plateNumber: driver.vehicle.plateNumber,
                color: driver.vehicle.color,
              }
            : null,
        };
      }),
    );

    // Filter out drivers with no location data
    return enriched.filter((d) => d.lat !== null && d.lng !== null);
  }

  // ── Recent Activity Feed ──────────────────────────────────

  async getRecentActivity(limit = 20) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48h

    const [recentUsers, recentTrips, recentKyc] = await Promise.all([
      // New signups
      prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      // Recent trips
      prisma.trip.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          status: true,
          totalFare: true,
          vehicleSegment: true,
          user: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      // KYC submissions
      prisma.driverProfile.findMany({
        where: {
          kycStatus: { in: [KYCStatus.PENDING, KYCStatus.VERIFIED] },
          updatedAt: { gte: since },
        },
        select: {
          id: true,
          kycStatus: true,
          user: { select: { name: true } },
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
    ]);

    // Merge into unified activity feed
    const activities: Array<{
      id: string;
      event: string;
      sub: string;
      icon: string;
      color: string;
      createdAt: Date;
    }> = [];

    for (const user of recentUsers) {
      activities.push({
        id: `user-${user.id}`,
        event: `New ${user.role.toLowerCase()} signup`,
        sub: user.name || "Unnamed user",
        icon: user.role === "DRIVER" ? "car" : "briefcase",
        color: "#EEF2F7",
        createdAt: user.createdAt,
      });
    }

    for (const trip of recentTrips) {
      const statusMap: Record<string, { icon: string; color: string }> = {
        PENDING_PAYMENT: { icon: "clock", color: "#FAEEDA" },
        CONFIRMED: { icon: "check-circle", color: "#EAF3DE" },
        DRIVER_ASSIGNED: { icon: "car", color: "#EEF2F7" },
        ACTIVE: { icon: "map", color: "#EEF2F7" },
        COMPLETED: { icon: "flag", color: "#EAF3DE" },
        CANCELLED: { icon: "x-circle", color: "#FCEBEB" },
      };
      const s = statusMap[trip.status] || { icon: "map-pin", color: "#EEF2F7" };
      activities.push({
        id: `trip-${trip.id}`,
        event: `Trip ${trip.status.toLowerCase().replace("_", " ")}`,
        sub: `${trip.user?.name || "Customer"} · ₹${trip.totalFare} · ${trip.vehicleSegment}`,
        icon: s.icon,
        color: s.color,
        createdAt: trip.createdAt,
      });
    }

    for (const kyc of recentKyc) {
      activities.push({
        id: `kyc-${kyc.id}`,
        event:
          kyc.kycStatus === KYCStatus.PENDING
            ? "KYC submitted for review"
            : "KYC verified",
        sub: kyc.user?.name || "Driver",
        icon:
          kyc.kycStatus === KYCStatus.PENDING ? "clipboard" : "check-circle",
        color: kyc.kycStatus === KYCStatus.PENDING ? "#FAEEDA" : "#EAF3DE",
        createdAt: kyc.updatedAt,
      });
    }

    // Sort by most recent first and limit
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activities.slice(0, limit);
  }

  async getCustomerIdViewUrl(userId: string, side: "front" | "back") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { idProofFront: true, idProofBack: true },
    });

    if (!user) throw new Error("User not found");

    const fileUrl = side === "front" ? user.idProofFront : user.idProofBack;
    if (!fileUrl) throw new Error(`No ${side} image found`);

    const viewUrl = await getPresignedGetUrl(fileUrl);
    return { viewUrl, side };
  }
}
