// backend/src/modules/activity/activity.service.ts
import prisma from "../../shared/db/prisma";

export type ActivityEvent = {
  type:
    | "trip_created"
    | "kyc_submitted"
    | "package_booked"
    | "id_submitted"
    | "driver_online"
    | "custom_plan_submitted";
  actorName: string;
  actorRole: string;
  description: string;
  timestamp: Date;
  entityId: string;
};

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  // Run all 4 queries in parallel — keeps response under 200ms
  const [recentTrips, pendingKyc, recentBookings, recentIdSubmissions] =
    await Promise.all([
      // Last 10 trips created
      prisma.trip.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, role: true } },
        },
      }),

      // Drivers who submitted KYC recently (kycStatus = PENDING)
      prisma.driverProfile.findMany({
        take: 10,
        where: { kycStatus: "PENDING" },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { name: true, phone: true } },
        },
      }),

      // Recent package bookings
      prisma.packageBooking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, role: true } },
          package: { select: { title: true } },
        },
      }),

      // Customers who submitted ID proof recently
      prisma.user.findMany({
        take: 10,
        where: {
          role: "CUSTOMER",
          idSubmittedAt: { not: null },
          idVerified: false,
        },
        orderBy: { idSubmittedAt: "desc" },
        select: {
          id: true,
          name: true,
          role: true,
          idSubmittedAt: true,
          idProofType: true,
        },
      }),
    ]);

  const events: ActivityEvent[] = [];

  recentTrips.forEach((t) => {
    events.push({
      type: "trip_created",
      actorName: t.user.name ?? "Unknown",
      actorRole: t.user.role,
      description: `New ${t.tripType.toLowerCase().replace("_", " ")} trip booked (${t.vehicleSegment})`,
      timestamp: t.createdAt,
      entityId: t.id,
    });
  });

  pendingKyc.forEach((d) => {
    events.push({
      type: "kyc_submitted",
      actorName: d.user.name ?? d.user.phone,
      actorRole: "DRIVER",
      description: "Driver submitted KYC documents for review",
      timestamp: d.updatedAt,
      entityId: d.id,
    });
  });

  recentBookings.forEach((b) => {
    events.push({
      type: "package_booked",
      actorName: b.user.name ?? "Unknown",
      actorRole: b.user.role,
      description: `Booked package: "${b.package.title}"`,
      timestamp: b.createdAt,
      entityId: b.id,
    });
  });

  recentIdSubmissions.forEach((u) => {
    events.push({
      type: "id_submitted",
      actorName: u.name ?? "Unknown",
      actorRole: "CUSTOMER",
      description: `Submitted ${u.idProofType ?? "ID proof"} for verification`,
      timestamp: u.idSubmittedAt!,
      entityId: u.id,
    });
  });

  // Sort all events by timestamp descending, return top 20
  return events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);
}
