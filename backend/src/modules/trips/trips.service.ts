import prisma from "../../shared/db/prisma";
import { calculateTripFare } from "./trips.fare";
import { getRouteInfo } from "../rides/rides.mappls";
import { VehicleSegment, TripStatus } from "../../shared/types/enums";
import { io } from "../../shared/socket/socket";
import { SOCKET_EVENTS } from "../../shared/socket/socket.events";

// ── Helper: calculate total days between two dates ──────────

const calcTotalDays = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ── Helper: default segment from passenger count ────────────

const suggestSegment = (passengerCount: number): VehicleSegment => {
  if (passengerCount <= 4) return VehicleSegment.SWIFT;
  if (passengerCount <= 6) return VehicleSegment.PRESTIGE;
  if (passengerCount <= 7) return VehicleSegment.VOYAGER;
  if (passengerCount <= 12) return VehicleSegment.TEMPO;
  return VehicleSegment.BUS;
};

export const tripsService = {
  // ── 1. Estimate fare ────────────────────────────────────────

  estimate: async (
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    passengerCount: number,
    startDate: string,
    endDate: string,
    isRoundTrip: boolean = false,
    preferredSegment?: string,
  ) => {
    const route = await getRouteInfo(pickupLat, pickupLng, dropLat, dropLng);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = calcTotalDays(start, end);

    const segment =
      (preferredSegment as VehicleSegment) || suggestSegment(passengerCount);

    const fare = calculateTripFare({
      passengerCount,
      preferredSegment: segment,
      distanceKm: route.distanceKm,
      totalDays,
      isRoundTrip,
    });

    return {
      fare,
      route: {
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
      },
      totalDays,
      isMultiDay: totalDays > 1,
    };
  },

  // ── 2. Create trip ──────────────────────────────────────────

  create: async (
    customerId: string,
    tripData: {
      pickupAddress: string;
      pickupLat: number;
      pickupLng: number;
      dropAddress: string;
      dropLat: number;
      dropLng: number;
      passengerCount: number;
      startDate: string;
      endDate: string;
      isRoundTrip?: boolean;
      preferredSegment?: string;
      waypoints?: {
        address: string;
        lat: number;
        lng: number;
        order: number;
      }[];
    },
  ) => {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);

    // Validate: startDate must be in the future
    if (start <= new Date()) {
      throw new Error("Start date must be in the future");
    }
    if (end < start) {
      throw new Error("End date cannot be before start date");
    }

    const totalDays = calcTotalDays(start, end);
    const route = await getRouteInfo(
      tripData.pickupLat,
      tripData.pickupLng,
      tripData.dropLat,
      tripData.dropLng,
    );

    const segment =
      (tripData.preferredSegment as VehicleSegment) ||
      suggestSegment(tripData.passengerCount);

    const fare = calculateTripFare({
      passengerCount: tripData.passengerCount,
      preferredSegment: segment,
      distanceKm: route.distanceKm,
      totalDays,
      isRoundTrip: tripData.isRoundTrip || false,
    });

    const trip = await prisma.trip.create({
      data: {
        customerId,
        pickupAddress: tripData.pickupAddress,
        pickupLat: tripData.pickupLat,
        pickupLng: tripData.pickupLng,
        dropAddress: tripData.dropAddress,
        dropLat: tripData.dropLat,
        dropLng: tripData.dropLng,
        isRoundTrip: tripData.isRoundTrip || false,
        passengerCount: tripData.passengerCount,
        suggestedSegment: fare.suggestedSegment,
        actualSegment: fare.actualSegment,
        extraPassengers: fare.extraPassengers,
        extraHeadCharge: fare.extraHeadCharge,
        forceUpgraded: fare.forceUpgraded,
        startDate: start,
        endDate: end,
        totalDays,
        isMultiDay: totalDays > 1,
        distanceKm: route.distanceKm,
        perKmRate: fare.perKmRate,
        baseFare: fare.baseFare,
        driverAllowance: fare.driverAllowance,
        roundTripDiscount: fare.roundTripDiscount,
        totalFare: fare.totalFare,
        status: TripStatus.OPEN,
        paymentStatus: "PENDING",
        // Create waypoints if provided
        waypoints: tripData.waypoints
          ? {
              create: tripData.waypoints.map((wp) => ({
                address: wp.address,
                lat: wp.lat,
                lng: wp.lng,
                order: wp.order,
              })),
            }
          : undefined,
      },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return trip;
  },

  // ── 3. Confirm payment ──────────────────────────────────────

  confirmPayment: async (tripId: string, razorpayOrderId: string) => {
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        paymentStatus: "PAID",
        razorpayOrderId,
        paidAt: new Date(),
      },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // Notify all online drivers with matching segment
    if (io) {
      io.to("drivers:online").emit(SOCKET_EVENTS.TRIP_OPEN, {
        tripId: trip.id,
        pickupAddress: trip.pickupAddress,
        dropAddress: trip.dropAddress,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalDays: trip.totalDays,
        passengerCount: trip.passengerCount,
        actualSegment: trip.actualSegment,
        distanceKm: trip.distanceKm,
        totalFare: trip.totalFare,
      });
    }

    return trip;
  },

  // ── 4. Get open jobs for drivers ────────────────────────────

  getOpenJobs: async (driverSegment: VehicleSegment) => {
    const trips = await prisma.trip.findMany({
      where: {
        actualSegment: driverSegment,
        status: TripStatus.OPEN,
        paymentStatus: "PAID",
      },
      orderBy: { startDate: "asc" },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return trips;
  },

  // ── 5. Driver accepts trip ──────────────────────────────────

  accept: async (tripId: string, driverUserId: string) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
      include: { vehicle: true },
    });
    if (!driver) throw new Error("Driver profile not found");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== TripStatus.OPEN)
      throw new Error("Trip no longer available");

    // Verify driver's vehicle segment matches trip
    if (driver.segment !== trip.actualSegment) {
      throw new Error("Vehicle segment does not match trip requirement");
    }

    const [updated] = await Promise.all([
      prisma.trip.update({
        where: { id: tripId },
        data: {
          driverId: driver.id,
          status: TripStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          waypoints: { orderBy: { order: "asc" } },
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
        where: { id: driver.id },
        data: { isAvailable: false },
      }),
    ]);

    // Notify customer
    if (io) {
      io.to(`user:${trip.customerId}`).emit(SOCKET_EVENTS.TRIP_ACCEPTED, {
        tripId: updated.id,
        driver: {
          name: updated.driver?.user?.name,
          phone: updated.driver?.user?.phone,
          rating: updated.driver?.rating,
        },
        vehicle: updated.driver?.vehicle
          ? {
              make: updated.driver.vehicle.make,
              model: updated.driver.vehicle.model,
              color: updated.driver.vehicle.color,
              plateNumber: updated.driver.vehicle.plateNumber,
            }
          : null,
      });
    }

    return updated;
  },

  // ── 6. Driver marks enroute to pickup ───────────────────────

  markEnroute: async (tripId: string, driverUserId: string) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) throw new Error("Driver profile not found");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.driverId !== driver.id) throw new Error("Unauthorized");
    if (trip.status !== TripStatus.ACCEPTED)
      throw new Error("Invalid trip status");

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.DRIVER_ENROUTE },
    });

    if (io) {
      io.to(`user:${trip.customerId}`).emit(SOCKET_EVENTS.TRIP_ENROUTE, {
        tripId: updated.id,
      });
    }

    return updated;
  },

  // ── 7. Start trip ───────────────────────────────────────────

  start: async (tripId: string, driverUserId: string) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) throw new Error("Driver profile not found");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.driverId !== driver.id) throw new Error("Unauthorized");
    if (trip.status !== TripStatus.DRIVER_ENROUTE)
      throw new Error("Invalid trip status");

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    if (io) {
      io.to(`user:${trip.customerId}`).emit(SOCKET_EVENTS.TRIP_STARTED, {
        tripId: updated.id,
      });
    }

    return updated;
  },

  // ── 8. Complete trip ────────────────────────────────────────

  complete: async (tripId: string, driverUserId: string) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) throw new Error("Driver profile not found");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.driverId !== driver.id) throw new Error("Unauthorized");
    if (trip.status !== TripStatus.IN_PROGRESS)
      throw new Error("Invalid trip status");

    // Commission: 15% of totalFare
    const commission = parseFloat((trip.totalFare * 0.15).toFixed(2));
    const allowance = trip.driverAllowance;
    const net = parseFloat((trip.totalFare - commission).toFixed(2));

    const [updated] = await Promise.all([
      prisma.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          completedAt: new Date(),
        },
      }),
      prisma.tripEarning.create({
        data: {
          driverId: driver.id,
          tripId,
          gross: trip.totalFare,
          commission,
          allowance,
          net,
        },
      }),
      prisma.driverProfile.update({
        where: { id: driver.id },
        data: {
          isAvailable: true,
          totalTrips: { increment: 1 },
          totalEarnings: { increment: net },
        },
      }),
    ]);

    if (io) {
      io.to(`user:${trip.customerId}`).emit(SOCKET_EVENTS.TRIP_COMPLETED, {
        tripId: updated.id,
        totalFare: trip.totalFare,
        earnings: { gross: trip.totalFare, commission, allowance, net },
      });
    }

    return {
      trip: updated,
      earnings: { gross: trip.totalFare, commission, allowance, net },
    };
  },

  // ── 9. Cancel by customer ───────────────────────────────────

  cancelByCustomer: async (
    tripId: string,
    customerId: string,
    reason?: string,
  ) => {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.customerId !== customerId) throw new Error("Unauthorized");

    const cancellableStatuses = [TripStatus.OPEN, TripStatus.ACCEPTED];
    if (!cancellableStatuses.includes(trip.status as TripStatus)) {
      throw new Error("Trip cannot be cancelled at this stage");
    }

    // Refund 90%, keep 10%
    const refundAmount = parseFloat((trip.totalFare * 0.9).toFixed(2));

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.CANCELLED,
        cancelledBy: customerId,
        cancelReason: reason,
        cancelledAt: new Date(),
        refundAmount,
        refundStatus: "PENDING",
        paymentStatus: "PARTIAL_REFUND",
      },
    });

    // If driver was assigned, free them up (no strike for driver here — customer cancelled)
    if (trip.driverId) {
      await prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: { isAvailable: true },
      });

      if (io) {
        // Find driver userId to notify
        const driverProfile = await prisma.driverProfile.findUnique({
          where: { id: trip.driverId },
        });
        if (driverProfile) {
          io.to(`user:${driverProfile.userId}`).emit(
            SOCKET_EVENTS.TRIP_CANCELLED,
            {
              tripId: updated.id,
              cancelledBy: "customer",
              reason,
            },
          );
        }
      }
    }

    return updated;
  },

  // ── 10. Cancel by driver ────────────────────────────────────

  cancelByDriver: async (
    tripId: string,
    driverUserId: string,
    reason?: string,
  ) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) throw new Error("Driver profile not found");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.driverId !== driver.id) throw new Error("Unauthorized");

    if (
      trip.status !== TripStatus.ACCEPTED &&
      trip.status !== TripStatus.DRIVER_ENROUTE
    ) {
      throw new Error("Trip cannot be cancelled at this stage");
    }

    // Reset trip to OPEN, clear driver
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.OPEN,
        driverId: null,
        acceptedAt: null,
      },
    });

    // Increment driver strikes
    const newStrikes = driver.strikes + 1;
    const updateData: any = {
      strikes: newStrikes,
      isAvailable: true,
    };

    // 3 strikes = suspension
    if (newStrikes >= 3) {
      await prisma.user.update({
        where: { id: driverUserId },
        data: { status: "BANNED" },
      });
    }

    await prisma.driverProfile.update({
      where: { id: driver.id },
      data: updateData,
    });

    // Notify customer: finding new driver
    if (io) {
      io.to(`user:${trip.customerId}`).emit(SOCKET_EVENTS.TRIP_REASSIGNING, {
        tripId: updated.id,
        message: "Your driver cancelled. Finding a new driver for your trip.",
      });

      // Re-broadcast to all drivers
      io.to("drivers:online").emit(SOCKET_EVENTS.TRIP_OPEN, {
        tripId: updated.id,
        pickupAddress: trip.pickupAddress,
        dropAddress: trip.dropAddress,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalDays: trip.totalDays,
        passengerCount: trip.passengerCount,
        actualSegment: trip.actualSegment,
        distanceKm: trip.distanceKm,
        totalFare: trip.totalFare,
      });
    }

    return updated;
  },

  // ── 11. Get customer trips ──────────────────────────────────

  getCustomerTrips: async (
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ) => {
    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          waypoints: { orderBy: { order: "asc" } },
          driver: {
            include: {
              user: { select: { name: true, phone: true } },
              vehicle: {
                select: {
                  make: true,
                  model: true,
                  color: true,
                  plateNumber: true,
                },
              },
            },
          },
        },
      }),
      prisma.trip.count({ where: { customerId } }),
    ]);

    return {
      trips,
      total,
      page,
      limit,
      hasMore: skip + trips.length < total,
    };
  },

  // ── 12. Get driver trips ────────────────────────────────────

  getDriverTrips: async (
    driverUserId: string,
    page: number = 1,
    limit: number = 10,
  ) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver) throw new Error("Driver profile not found");

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: { driverId: driver.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          waypoints: { orderBy: { order: "asc" } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.trip.count({ where: { driverId: driver.id } }),
    ]);

    return {
      trips,
      total,
      page,
      limit,
      hasMore: skip + trips.length < total,
    };
  },

  // ── 13. Get trip by ID ──────────────────────────────────────

  getById: async (tripId: string, userId: string) => {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        customer: { select: { id: true, name: true, phone: true } },
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
            vehicle: true,
          },
        },
        ratings: true,
        earning: true,
      },
    });

    if (!trip) throw new Error("Trip not found");

    // Only customer or assigned driver can view
    if (trip.customerId !== userId && trip.driver?.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return trip;
  },
};
