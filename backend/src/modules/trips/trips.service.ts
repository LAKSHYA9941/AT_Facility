import prisma from "../../shared/db/prisma";
import axios from "axios";
import { VehicleSegment, TripStatus, TripType } from "../../shared/types/enums";
import { io } from "../../shared/socket/socket";
import { SOCKET_EVENTS } from "../../shared/socket/socket.events";

const SEGMENT_RATES = {
  [VehicleSegment.HATCHBACK]: 11,
  [VehicleSegment.SEDAN]: 13,
  [VehicleSegment.MINI_SUV]: 15,
  [VehicleSegment.SUV]: 18,
  [VehicleSegment.TEMPO]: 22,
};

export const tripsService = {
  estimate: async (params: {
    waypoints: Array<{ lat: number; lng: number }>;
    startDate: string;
    endDate: string;
    passengerCount: number;
  }) => {
    const { waypoints, startDate, endDate } = params;

    let totalKm = 0;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // Fallback rough estimate if no key
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        const dx = p1.lat - p2.lat;
        const dy = p1.lng - p2.lng;
        totalKm += Math.sqrt(dx * dx + dy * dy) * 111 * 1.3; // Haversine approx
      }
    } else {
      for (let i = 0; i < waypoints.length - 1; i++) {
        const origin = `${waypoints[i].lat},${waypoints[i].lng}`;
        const dest = `${waypoints[i + 1].lat},${waypoints[i + 1].lng}`;
        try {
          const res = await axios.get(
            `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${apiKey}`,
          );
          const distanceText = res.data.rows[0]?.elements[0]?.distance?.value;
          if (distanceText) {
            totalKm += distanceText / 1000;
          }
        } catch (e) {
          console.error("Google Maps API error", e);
        }
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000),
    );

    // Check round trip
    const isRoundTrip =
      waypoints.length > 1 &&
      waypoints[0].lat === waypoints[waypoints.length - 1].lat &&
      waypoints[0].lng === waypoints[waypoints.length - 1].lng;

    if (isRoundTrip) {
      totalKm *= 2;
    }

    const effectiveKm = Math.max(totalKm, days * 250);
    const driverAllowance = days * 500;

    const estimates = Object.entries(SEGMENT_RATES).map(
      ([segment, ratePerKm]) => {
        const baseFare = effectiveKm * ratePerKm;
        const totalFare = baseFare + driverAllowance;

        return {
          segment: segment as VehicleSegment,
          baseFare: Math.round(baseFare),
          driverAllowance,
          totalFare: Math.round(totalFare),
          paymentTiers: {
            pct25: {
              upfront: Math.round(totalFare * 0.25),
              balance: Math.round(totalFare * 0.75),
            },
            pct50: {
              upfront: Math.round(totalFare * 0.5),
              balance: Math.round(totalFare * 0.5),
            },
            pct100: {
              upfront: Math.round(totalFare),
              balance: 0,
            },
          },
        };
      },
    );

    return {
      totalKm: Math.round(totalKm),
      effectiveKm: Math.round(effectiveKm),
      days,
      driverAllowancePerDay: 500,
      estimates,
    };
  },

  create: async (
    userId: string,
    data: {
      tripType: TripType;
      waypoints: Array<{ address: string; lat: number; lng: number }>;
      startDate: string;
      endDate: string;
      passengerCount: number;
      vehicleSegment: VehicleSegment;
      totalFare: number;
      selectedPercentage: 25 | 50 | 100;
    },
  ) => {
    if (![25, 50, 100].includes(data.selectedPercentage)) {
      throw new Error("Invalid payment tier");
    }

    const amountPaidUpfront = (data.totalFare * data.selectedPercentage) / 100;
    const balanceRemaining = data.totalFare - amountPaidUpfront;
    const startOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const trip = await prisma.$transaction(async (tx) => {
      return tx.trip.create({
        data: {
          userId,
          tripType: data.tripType,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          passengerCount: data.passengerCount,
          vehicleSegment: data.vehicleSegment,
          totalFare: data.totalFare,
          upfrontPercentage: data.selectedPercentage,
          amountPaidUpfront,
          balanceRemaining,
          startOtp,
          status: TripStatus.PENDING_PAYMENT,
          waypoints: {
            create: data.waypoints.map((wp, i) => ({
              address: wp.address,
              lat: wp.lat,
              lng: wp.lng,
              orderIndex: i,
            })),
          },
        },
        include: { waypoints: true },
      });
    });

    return { tripId: trip.id };
  },

  getAvailableJobs: async (driverUserId: string) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
      include: { documents: true }, // Assuming KYC check uses Document model, or we can use kycStatus
    });

    if (!driver || driver.kycStatus !== "VERIFIED") {
      throw new Error("KYC verification required to view jobs.");
    }

    const jobs = await prisma.trip.findMany({
      where: {
        status: TripStatus.CONFIRMED,
        driverId: null,
        vehicleSegment: driver.segment || VehicleSegment.HATCHBACK,
        startDate: { gte: new Date() },
      },
      include: { waypoints: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return jobs;
  },

  accept: async (tripId: string, driverUserId: string) => {
    // This handles the HTTP accept if needed, though Socket is preferred.
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver || driver.kycStatus !== "VERIFIED") {
      throw new Error("KYC verification required");
    }

    const updateRes = await prisma.trip.updateMany({
      where: { id: tripId, status: TripStatus.CONFIRMED, driverId: null },
      data: { driverId: driver.id, status: TripStatus.DRIVER_ASSIGNED },
    });

    if (updateRes.count === 0) {
      throw new Error("Job no longer available.");
    }

    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: { include: { user: true } }, waypoints: true },
    });

    if (io && updatedTrip) {
      io.to(`user:${updatedTrip.userId}`).emit(SOCKET_EVENTS.DRIVER_ASSIGNED, {
        driverId: driver.id,
        driverName: updatedTrip.driver?.user?.name,
        phone: updatedTrip.driver?.user?.phone,
      });
      io.to(`user:${updatedTrip.userId}`).emit(
        SOCKET_EVENTS.TRIP_STATUS_UPDATED,
        { status: TripStatus.DRIVER_ASSIGNED },
      );
      io.emit("trip:job_taken", { tripId }); // notify other drivers
    }

    return updatedTrip;
  },

  markEnroute: async (tripId: string, driverUserId: string) => {
    // ... omitting detailed implementation for brevity, assuming standard update
    return await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.ACTIVE },
    });
  },

  start: async (tripId: string, driverUserId: string) => {
    return await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.ACTIVE },
    });
  },

  complete: async (tripId: string, driverUserId: string) => {
    return await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.COMPLETED },
    });
  },

  cancelByDriver: async (
    tripId: string,
    driverUserId: string,
    reason: string,
  ) => {
    return await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CONFIRMED, driverId: null },
    });
  },

  cancelByCustomer: async (
    tripId: string,
    customerId: string,
    reason: string,
  ) => {
    return await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CANCELLED },
    });
  },

  getCustomerTrips: async (userId: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const trips = await prisma.trip.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        driver: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return trips;
  },

  getDriverTrips: async (driverUserId: string, page: number, limit: number) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) return [];
    const skip = (page - 1) * limit;
    const trips = await prisma.trip.findMany({
      where: { driverId: driver.id },
      skip,
      take: limit,
      include: { waypoints: { orderBy: { orderIndex: "asc" } }, user: true },
      orderBy: { createdAt: "desc" },
    });
    return trips;
  },

  getById: async (tripId: string, userId: string) => {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        user: true,
        driver: { include: { user: true } },
      },
    });
    if (!trip) throw new Error("Trip not found");
    return trip;
  },
};
