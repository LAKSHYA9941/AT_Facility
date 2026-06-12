import prisma from "../../shared/db/prisma";
import axios from "axios";
import { VehicleSegment, TripStatus, TripType } from "@prisma/client";
import { messagingService } from "../notifications/messaging.service";

import { FLAT_RATES, SEGMENT_RATES } from "../../config/pricing";
import { logger } from "../../shared/logger/logger";

export const tripsService = {
  estimate: async (params: {
    tripType?: string;
    waypoints: Array<{ lat: number; lng: number }>;
    startDate: string;
    endDate: string;
    passengerCount: number;
  }) => {
    const { tripType, waypoints, startDate, endDate } = params;

    let totalKm = 0;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const mapplsKey = process.env.MAPPLS_REST_API_KEY;

    if (mapplsKey) {
      // Mappls (MapMyIndia) Distance Matrix — preferred for India routes
      for (let i = 0; i < waypoints.length - 1; i++) {
        const origin = `${waypoints[i].lng},${waypoints[i].lat}`; // lng,lat order for Mappls
        const dest = `${waypoints[i + 1].lng},${waypoints[i + 1].lat}`;
        try {
          const res = await axios.get(
            `https://apis.mappls.com/advancedmaps/v1/${mapplsKey}/distance_matrix/driving/${origin};${dest}`,
          );
          const meters = res.data?.results?.distances?.[0]?.[1];
          if (meters) totalKm += meters / 1000;
        } catch (e) {
          logger.error({ error: e }, "Mappls Distance Matrix API error");
        }
      }
    } else if (googleKey) {
      // Google Maps Distance Matrix fallback
      for (let i = 0; i < waypoints.length - 1; i++) {
        const origin = `${waypoints[i].lat},${waypoints[i].lng}`;
        const dest = `${waypoints[i + 1].lat},${waypoints[i + 1].lng}`;
        try {
          const res = await axios.get(
            `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${googleKey}`,
          );
          const distanceText = res.data.rows[0]?.elements[0]?.distance?.value;
          if (distanceText) {
            totalKm += distanceText / 1000;
          }
        } catch (e) {
          logger.error({ error: e }, "Google Maps API error");
        }
      }
    } else {
      // Fallback rough estimate if no key
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        const dx = p1.lat - p2.lat;
        const dy = p1.lng - p2.lng;
        totalKm += Math.sqrt(dx * dx + dy * dy) * 111 * 1.3; // Haversine approx
      }
    }

    const isRoundTrip = tripType === "ROUND_TRIP";

    // If it's a round trip, we need to ensure the return distance is calculated
    // since the frontend no longer auto-appends the pickup location.
    if (isRoundTrip && waypoints.length > 1) {
      const first = waypoints[0];
      const last = waypoints[waypoints.length - 1];
      const distanceToStart = Math.sqrt(
        Math.pow(first.lat - last.lat, 2) + Math.pow(first.lng - last.lng, 2),
      );

      // If the last waypoint is not roughly the same as the first, add the return leg
      if (distanceToStart > 0.01) {
        if (mapplsKey) {
          const origin = `${last.lng},${last.lat}`;
          const dest = `${first.lng},${first.lat}`;
          try {
            const res = await axios.get(
              `https://apis.mappls.com/advancedmaps/v1/${mapplsKey}/distance_matrix/driving/${origin};${dest}`,
            );
            const meters = res.data?.results?.distances?.[0]?.[1];
            if (meters) totalKm += meters / 1000;
          } catch (e) {
            logger.error({ error: e }, "Mappls Return Leg API error");
          }
        } else if (googleKey) {
          const origin = `${last.lat},${last.lng}`;
          const dest = `${first.lat},${first.lng}`;
          try {
            const res = await axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${googleKey}`,
            );
            const distanceText = res.data.rows[0]?.elements[0]?.distance?.value;
            if (distanceText) totalKm += distanceText / 1000;
          } catch (e) {
            logger.error({ error: e }, "Google Maps Return Leg API error");
          }
        } else {
          totalKm += distanceToStart * 111 * 1.3;
        }
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000),
    );

    // In India, if a trip is one-way outstation, cabs usually charge for the return journey
    // to cover the empty trip back, OR they have a 130km minimum.
    // If it's a round trip, there's usually a 250km/day minimum.

    let billableKm = totalKm;
    if (isRoundTrip) {
      // Standard 250km minimum per day for round trips
      billableKm = Math.max(totalKm, days * 250);
    } else {
      // For one-way trips, charge for return journey (totalKm * 2)
      // with a minimum of 130km to make it realistic
      billableKm = Math.max(totalKm * 2, 130);
    }

    // Driver allowance is usually a flat fee per day for outstation
    const driverAllowancePerDay = 300;

    // Pricing rules imported from config
    const estimates = Object.entries(SEGMENT_RATES).map(
      ([segment, ratePerKm]) => {
        let baseFare = 0;
        let driverAllowance = days * driverAllowancePerDay;
        let totalFare = 0;

        if (days > 1 && isRoundTrip) {
          // Multi-day round trip might use flat rate if it's a package,
          // but typically outstation is still per-km with a 250km/day minimum.
          baseFare = billableKm * ratePerKm;
          totalFare = baseFare + driverAllowance;
        } else {
          // Single-day or one-way trip
          baseFare = billableKm * ratePerKm;
          totalFare = baseFare + driverAllowance;
        }

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
      effectiveKm: Math.round(billableKm),
      days,
      driverAllowancePerDay,
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

    const estimateResult = await tripsService.estimate({
      tripType: data.tripType,
      waypoints: data.waypoints,
      startDate: data.startDate,
      endDate: data.endDate,
      passengerCount: data.passengerCount,
    });

    const segmentEstimate = estimateResult.estimates.find(
      (e) => e.segment === data.vehicleSegment,
    );

    if (!segmentEstimate) {
      throw new Error("Invalid vehicle segment for this route");
    }

    const trustedTotalFare = segmentEstimate.totalFare;
    const amountPaidUpfront = Math.round(
      (trustedTotalFare * data.selectedPercentage) / 100,
    );
    const balanceRemaining = trustedTotalFare - amountPaidUpfront;
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
          totalFare: trustedTotalFare,
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
    });

    if (!driver) {
      throw new Error("Driver profile not found");
    }

    const jobs = await prisma.trip.findMany({
      where: {
        status: TripStatus.CONFIRMED,
        driverId: null,
        // Optionally filter by segment, or if null show all. We can show all if driver has no segment yet.
        ...(driver.segment ? { vehicleSegment: driver.segment } : {}),
        startDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Allow trips from the past 24 hours
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
      include: {
        user: true,
        driver: { include: { user: true, vehicle: true } },
        waypoints: true,
      },
    });

    // Send MSG91 SMS to customer & driver
    if (
      updatedTrip?.user?.phone &&
      updatedTrip?.driver?.user?.name &&
      updatedTrip?.driver?.user?.phone
    ) {
      const vehiclePlate = updatedTrip.driver.vehicle?.plateNumber || "Vehicle";
      messagingService.sendDriverAssigned(
        tripId,
        updatedTrip.user.phone,
        updatedTrip.driver.user.name,
        vehiclePlate,
        updatedTrip.driver.user.phone,
      );
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

  start: async (tripId: string, driverUserId: string, otp: string) => {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });

    if (!trip) throw new Error("Trip not found");
    if (trip.driver?.userId !== driverUserId)
      throw new Error("Unauthorized driver");
    if (trip.startOtp !== otp) throw new Error("Invalid OTP");

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.ACTIVE },
    });

    // TODO: Consider adding sendTripStarted in the future.
    return updatedTrip;
  },

  complete: async (tripId: string, driverUserId: string) => {
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.COMPLETED },
      include: { user: true },
    });

    if (updatedTrip.user?.phone) {
      messagingService.sendTripCompleted(
        tripId,
        updatedTrip.user.phone,
        updatedTrip.totalFare,
      );
    }
    return updatedTrip;
  },

  cancelByDriver: async (
    tripId: string,
    driverUserId: string,
    reason: string,
  ) => {
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CONFIRMED, driverId: null },
      include: { user: true },
    });

    if (updatedTrip.user?.phone) {
      messagingService.sendTripCancelled(updatedTrip.user.phone, "CUSTOMER");
    }
    return updatedTrip;
  },

  cancelByCustomer: async (
    tripId: string,
    customerId: string,
    reason: string,
  ) => {
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CANCELLED },
      include: { driver: { include: { user: true } } },
    });

    if (updatedTrip.driver?.user?.phone) {
      messagingService.sendTripCancelled(
        updatedTrip.driver.user.phone,
        "DRIVER",
      );
    }
    return updatedTrip;
  },

  getCustomerTrips: async (userId: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const trips = await prisma.trip.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        driver: { include: { user: true, vehicle: true } },
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
        driver: { include: { user: true, vehicle: true } },
      },
    });
    if (!trip) throw new Error("Trip not found");
    return trip;
  },
};
