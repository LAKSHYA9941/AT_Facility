import prisma from "../../shared/db/prisma";
import { VehicleSegment } from "../../shared/types/enums";

export class DriverService {
  async upsertVehicle(
    userId: string,
    data: {
      make: string;
      model: string;
      color: string;
      year: number;
      plateNumber: string;
      registrationNumber: string;
      segment: VehicleSegment;
      maxCapacity: number;
    },
  ) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: profile.id },
      create: {
        driverId: profile.id,
        ...data,
      },
      update: {
        ...data,
      },
    });

    // Also update segment on driver profile for quick access
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { segment: data.segment },
    });

    return vehicle;
  }
  async getVehicle(userId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { vehicle: true },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    return profile.vehicle;
  }

  async toggleStatus(userId: string, isOnline: boolean) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    // Only allow verified drivers to go online
    if (isOnline && profile.kycStatus !== "VERIFIED") {
      throw new Error("KYC not verified. Cannot go online.");
    }

    return await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { isOnline, isAvailable: isOnline },
    });
  }

  async getEarnings(userId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Week starts on Monday
    const dayOfWeek = now.getDay() || 7; // Sunday is 0, make it 7
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedTrips = await prisma.trip.findMany({
      where: {
        driverId: profile.id,
        status: "COMPLETED",
      },
    });

    let tripsToday = 0;
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    const weekBars = [
      { day: "Mon", amount: 0, trips: 0 },
      { day: "Tue", amount: 0, trips: 0 },
      { day: "Wed", amount: 0, trips: 0 },
      { day: "Thu", amount: 0, trips: 0 },
      { day: "Fri", amount: 0, trips: 0 },
      { day: "Sat", amount: 0, trips: 0 },
      { day: "Sun", amount: 0, trips: 0 },
    ];

    for (const trip of completedTrips) {
      const tripDate = new Date(trip.endDate);
      const fare = trip.totalFare || 0;

      if (tripDate >= startOfToday) {
        tripsToday++;
        today += fare;
      }
      if (tripDate >= startOfWeek) {
        thisWeek += fare;
        const dayIdx = tripDate.getDay() === 0 ? 6 : tripDate.getDay() - 1;
        weekBars[dayIdx].amount += fare;
        weekBars[dayIdx].trips += 1;
      }
      if (tripDate >= startOfMonth) {
        thisMonth += fare;
      }
    }

    return {
      tripsToday,
      today,
      thisWeek,
      thisMonth,
      weekBars,
      bankDetails: {
        accountNumber: profile.bankAccountNumber
          ? profile.bankAccountNumber.slice(-4)
          : null,
      },
    };
  }

  async getEarningsHistory(userId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    const trips = await prisma.trip.findMany({
      where: {
        driverId: profile.id,
        status: "COMPLETED",
      },
      orderBy: { endDate: "desc" },
      take: 20,
      include: {
        waypoints: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return trips.map((t) => ({
      id: t.id,
      route:
        t.waypoints.length > 0
          ? `${t.waypoints[0].address} to ${t.waypoints[t.waypoints.length - 1].address}`
          : "Custom Trip",
      createdAt: t.endDate,
      fare: t.totalFare,
    }));
  }
}
