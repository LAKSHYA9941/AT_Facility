import prisma from "../../shared/db/prisma";
import { calculateFare } from "./rides.fare";
import { findSingleNearestDriver } from "./rides.dispatch";
import { getRouteInfo } from "./rides.mappls";
import { VehicleSegment, RideStatus } from "../../shared/types/enums";
import { generateOTP } from "../../shared/utils/otp";
import { sendRideRequest } from "../../shared/socket/socket";
import { SOCKET_EVENTS } from "../../shared/socket/socket.events";

export const ridesService = {
  // ── Fare estimate (before booking) ────────────────────────
  estimate: async (
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    segment: VehicleSegment,
    passengerCount: number = 1,
  ) => {
    const route = await getRouteInfo(pickupLat, pickupLng, dropLat, dropLng);
    const fare = calculateFare(
      segment,
      route.distanceKm,
      route.durationMin,
      passengerCount,
    );

    // Find nearby drivers to show ETA
    const nearbyDrivers = await findSingleNearestDriver(
      pickupLat,
      pickupLng,
      segment,
    );

    return {
      fare,
      route,
      etaMinutes: nearbyDrivers?.etaMinutes ?? null,
      driversNearby: nearbyDrivers ? 1 : 0,
    };
  },

  // ── Create ride ────────────────────────────────────────────
  create: async (
    customerId: string,
    pickupAddress: string,
    pickupLat: number,
    pickupLng: number,
    dropAddress: string,
    dropLat: number,
    dropLng: number,
    segment: VehicleSegment,
    passengerCount: number = 1,
    paymentMethod: string = "CASH",
  ) => {
    const route = await getRouteInfo(pickupLat, pickupLng, dropLat, dropLng);
    const fare = calculateFare(
      segment,
      route.distanceKm,
      route.durationMin,
      passengerCount,
    );
    const otp = generateOTP(6);

    const ride = await prisma.ride.create({
      data: {
        customerId,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropAddress,
        dropLat,
        dropLng,
        segment,
        status: "SEARCHING",
        passengerCount,
        baseFare: fare.baseFare,
        perKmFare: fare.distanceFare,
        surgeFare: fare.surgeFare,
        extraHeadFare: fare.extraHeadFare,
        totalFare: fare.totalFare,
        distance: route.distanceKm,
        duration: route.durationMin,
        paymentMethod: paymentMethod as any,
        otp,
      },
      include: { customer: true },
    });

    // Dispatch to nearest driver asynchronously
    // Don't await — respond to customer immediately
    dispatchRide(ride.id, pickupLat, pickupLng, segment, ride).catch(
      console.error,
    );

    return ride;
  },

  // ── Get ride by ID ─────────────────────────────────────────
  getById: async (rideId: string, userId: string) => {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
            vehicle: true,
          },
        },
      },
    });

    if (!ride) throw new Error("Ride not found");
    if (ride.customerId !== userId && ride.driver?.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return ride;
  },

  // ── Cancel ride ────────────────────────────────────────────
  cancel: async (rideId: string, userId: string, reason?: string) => {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new Error("Ride not found");
    if (ride.customerId !== userId) throw new Error("Unauthorized");

    const cancellableStatuses = [
      RideStatus.SEARCHING,
      RideStatus.CONFIRMED,
      RideStatus.ARRIVING,
    ];

    if (!cancellableStatuses.includes(ride.status as RideStatus)) {
      throw new Error("Ride cannot be cancelled at this stage");
    }

    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: RideStatus.CANCELLED,
        cancelledBy: userId,
        cancelReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Free up driver if one was assigned
    if (ride.driverId) {
      await prisma.driverProfile.update({
        where: { id: ride.driverId },
        data: { isAvailable: true },
      });
    }

    return updated;
  },

  // ── Driver accepts ride ────────────────────────────────────
  accept: async (rideId: string, driverId: string) => {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new Error("Ride not found");
    if (ride.status !== RideStatus.SEARCHING)
      throw new Error("Ride no longer available");

    const [updated] = await Promise.all([
      prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          status: RideStatus.CONFIRMED,
          acceptedAt: new Date(),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          driver: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
              vehicle: true,
            },
          },
        },
      }),
      prisma.driverProfile.update({
        where: { id: driverId },
        data: { isAvailable: false },
      }),
    ]);

    return updated;
  },

  // ── Driver arrived at pickup ───────────────────────────────
  arrive: async (rideId: string, driverId: string) => {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new Error("Ride not found");
    if (ride.driverId !== driverId) throw new Error("Unauthorized");
    if (ride.status !== RideStatus.CONFIRMED)
      throw new Error("Invalid ride status");

    return prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.ARRIVING, arrivedAt: new Date() },
    });
  },

  // ── Driver starts ride (OTP verified) ─────────────────────
  start: async (rideId: string, driverId: string, submittedOtp: string) => {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new Error("Ride not found");
    if (ride.driverId !== driverId) throw new Error("Unauthorized");
    if (ride.status !== RideStatus.ARRIVING)
      throw new Error("Invalid ride status");
    if (ride.otp !== submittedOtp) throw new Error("Invalid OTP");

    return prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.IN_RIDE, startedAt: new Date() },
    });
  },

  // ── Driver completes ride ──────────────────────────────────
  complete: async (rideId: string, driverId: string) => {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    });

    if (!ride) throw new Error("Ride not found");
    if (ride.driverId !== driverId) throw new Error("Unauthorized");
    if (ride.status !== RideStatus.IN_RIDE)
      throw new Error("Invalid ride status");

    // Platform commission — 20%
    const commission = parseFloat((ride.totalFare * 0.2).toFixed(2));
    const net = parseFloat((ride.totalFare - commission).toFixed(2));

    const [updated] = await Promise.all([
      prisma.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
        },
      }),
      // Create earnings record
      prisma.earning.create({
        data: {
          driverId,
          rideId,
          gross: ride.totalFare,
          commission,
          net,
        },
      }),
      // Update driver stats
      prisma.driverProfile.update({
        where: { id: driverId },
        data: {
          isAvailable: true,
          totalTrips: { increment: 1 },
          totalEarnings: { increment: net },
        },
      }),
    ]);

    return {
      ride: updated,
      earnings: { gross: ride.totalFare, commission, net },
    };
  },

  // ── Get ride history for customer ─────────────────────────
  history: async (customerId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          driver: {
            include: {
              user: { select: { name: true } },
              vehicle: { select: { make: true, model: true } },
            },
          },
        },
      }),
      prisma.ride.count({ where: { customerId } }),
    ]);

    return {
      rides,
      total,
      page,
      limit,
      hasMore: skip + rides.length < total,
    };
  },
};

// ── Dispatch ride to nearest driver ───────────────────────────
const dispatchRide = async (
  rideId: string,
  pickupLat: number,
  pickupLng: number,
  segment: VehicleSegment,
  ride: any,
) => {
  const MAX_ATTEMPTS = 3;
  const ATTEMPT_WAIT = 10000; // 10s between attempts

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`🔍 Dispatch attempt ${attempt} for ride ${rideId}`);

    const driver = await findSingleNearestDriver(pickupLat, pickupLng, segment);

    if (!driver) {
      console.log(`⚠️ No drivers found on attempt ${attempt}`);
      if (attempt === MAX_ATTEMPTS) {
        // Update ride to cancelled — no drivers
        await prisma.ride.update({
          where: { id: rideId },
          data: { status: "CANCELLED", cancelReason: "No drivers available" },
        });
        // Notify customer
        const { io } = await import("../../shared/socket/socket");
        const updatedRide = await prisma.ride.findUnique({
          where: { id: rideId },
        });
        if (updatedRide) {
          io.to(`user:${updatedRide.customerId}`).emit(
            SOCKET_EVENTS.RIDE_NO_DRIVERS,
            {
              rideId,
              message: "No drivers available nearby. Please try again.",
            },
          );
        }
      }
      await new Promise((r) => setTimeout(r, ATTEMPT_WAIT));
      continue;
    }

    // Check ride still searching
    const currentRide = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!currentRide || currentRide.status !== "SEARCHING") {
      console.log(`ℹ️ Ride ${rideId} no longer searching`);
      return;
    }

    // Push request to driver
    sendRideRequest(driver.userId, {
      rideId,
      passenger: {
        name: ride.customer?.name || "Passenger",
        phone: ride.customer?.phone,
      },
      pickup: { address: ride.pickupAddress, lat: pickupLat, lng: pickupLng },
      drop: { address: ride.dropAddress, lat: ride.dropLat, lng: ride.dropLng },
      fare: ride.totalFare,
      distance: ride.distance,
      segment,
      etaToPickup: driver.etaMinutes,
    });

    console.log(`📤 Ride request sent to driver ${driver.userId}`);

    // Wait 15s for driver to accept
    await new Promise((r) => setTimeout(r, 15000));

    // Check if ride was accepted
    const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });
    if (updatedRide?.status !== "SEARCHING") {
      console.log(`✅ Ride ${rideId} accepted`);
      return;
    }

    console.log(`⏱️ Driver didn't respond — trying next`);
  }
};
