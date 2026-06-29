import prisma from "../../shared/db/prisma";
import axios from "axios";
import {
  VehicleSegment,
  TripStatus,
  TripType,
  PaymentType,
} from "@prisma/client";
import { messagingService } from "../notifications/messaging.service";
import { AppError } from "../../shared/utils/errors";

import { FLAT_RATES, SEGMENT_RATES, calculateFare } from "../../config/pricing";
import { logger } from "../../shared/logger/logger";

async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      address,
    )}&filter=countrycode:in&limit=1&apiKey=${apiKey}`;
    const res = await axios.get(url, { timeout: 5000 });
    const feature = res.data?.features?.[0];
    if (feature) {
      const { lat, lon } = feature.properties || {};
      if (typeof lat === "number" && typeof lon === "number") {
        return { lat, lng: lon };
      }
    }
    return null;
  } catch (err: any) {
    logger.error(
      { error: err.message || err, address },
      "Geoapify geocoding error",
    );
    return null;
  }
}

async function fetchDistanceKmFromWaypoints(
  waypoints: Array<{ lat: number; lng: number }>,
  apiKey: string,
): Promise<number | null> {
  if (waypoints.length < 2) return null;
  try {
    const waypointsStr = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join("|");
    const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${apiKey}`;
    const res = await axios.get(routingUrl, { timeout: 8000 });
    const distanceMeters = res.data?.features?.[0]?.properties?.distance;
    if (typeof distanceMeters === "number") {
      return distanceMeters / 1000;
    }
    return null;
  } catch (err: any) {
    logger.warn(
      { error: err.message || err },
      "Geoapify routing from waypoints failed",
    );
    return null;
  }
}

async function fetchDistanceKm(
  pickup: string,
  destinations: string[],
  distanceKmOverride?: number,
): Promise<number> {
  if (distanceKmOverride !== undefined && distanceKmOverride > 0) {
    return distanceKmOverride;
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    logger.warn("GEOAPIFY_API_KEY is not configured. Falling back to 250.");
    return 250;
  }

  try {
    const addresses = [pickup, ...destinations];
    const coordsPromises = addresses.map((addr) =>
      geocodeAddress(addr, apiKey),
    );
    const coordsResults = await Promise.all(coordsPromises);
    const waypoints = coordsResults.filter(
      (c): c is { lat: number; lng: number } => c !== null,
    );

    if (waypoints.length < 2) {
      logger.warn(
        "Not enough valid coordinates resolved. Falling back to 250.",
      );
      return 250;
    }

    const distance = await fetchDistanceKmFromWaypoints(waypoints, apiKey);
    if (distance !== null) {
      return Math.round(distance * 10) / 10;
    }

    return 250;
  } catch (err: any) {
    logger.error(
      { error: err.message || err },
      "fetchDistanceKm failed, returning 250 fallback",
    );
    return 250;
  }
}

async function resolveAddressCoords(
  pickup: string,
  destinations: string[],
  apiKey: string,
): Promise<Array<{ lat: number; lng: number }>> {
  const addresses = [pickup, ...destinations];
  const promises = addresses.map((addr) => geocodeAddress(addr, apiKey));
  const results = await Promise.all(promises);
  return results.filter((c): c is { lat: number; lng: number } => c !== null);
}

export const tripsService = {
  estimate: async (params: {
    tripType?: string;
    waypoints?: Array<{ lat: number; lng: number }>;
    pickupAddress?: string;
    destinations?: string[];
    distanceKm?: number;
    startDate: string;
    endDate: string;
    passengerCount: number;
  }) => {
    const {
      tripType,
      waypoints,
      pickupAddress,
      destinations,
      distanceKm,
      startDate,
      endDate,
    } = params;

    let totalKm = 0;
    const geoapifyKey = process.env.GEOAPIFY_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const mapplsKey = process.env.MAPPLS_REST_API_KEY;

    let coordsList: Array<{ lat: number; lng: number }> = [];

    if (pickupAddress && destinations && destinations.length > 0) {
      if (geoapifyKey) {
        coordsList = await resolveAddressCoords(
          pickupAddress,
          destinations,
          geoapifyKey,
        );
        totalKm = await fetchDistanceKm(
          pickupAddress,
          destinations,
          distanceKm,
        );
      } else {
        totalKm = distanceKm && distanceKm > 0 ? distanceKm : 250;
      }
    } else if (waypoints && waypoints.length >= 2) {
      coordsList = waypoints;
      if (geoapifyKey) {
        const dist = await fetchDistanceKmFromWaypoints(waypoints, geoapifyKey);
        if (dist !== null) {
          totalKm = dist;
        } else {
          totalKm = 250;
        }
      } else if (mapplsKey) {
        for (let i = 0; i < waypoints.length - 1; i++) {
          const origin = `${waypoints[i].lng},${waypoints[i].lat}`;
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
        for (let i = 0; i < waypoints.length - 1; i++) {
          const p1 = waypoints[i];
          const p2 = waypoints[i + 1];
          const dx = p1.lat - p2.lat;
          const dy = p1.lng - p2.lng;
          totalKm += Math.sqrt(dx * dx + dy * dy) * 111 * 1.3;
        }
      }
    }

    const isRoundTrip = tripType === "ROUND_TRIP";

    if (isRoundTrip && coordsList.length > 1) {
      const first = coordsList[0];
      const last = coordsList[coordsList.length - 1];
      const distanceToStart = Math.sqrt(
        Math.pow(first.lat - last.lat, 2) + Math.pow(first.lng - last.lng, 2),
      );

      if (distanceToStart > 0.01) {
        if (geoapifyKey) {
          const returnDist = await fetchDistanceKmFromWaypoints(
            [last, first],
            geoapifyKey,
          );
          if (returnDist !== null) {
            totalKm += returnDist;
          } else {
            totalKm += distanceToStart * 111 * 1.3;
          }
        } else if (mapplsKey) {
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

    let billableKm = totalKm;
    if (isRoundTrip) {
      billableKm = Math.max(totalKm, days * 250);
    } else {
      billableKm = Math.max(totalKm * 2, 130);
    }

    const driverAllowancePerDay = 300;

    const estimates = Object.keys(SEGMENT_RATES).map((seg) => {
      const segment = seg as VehicleSegment;
      const allInclusive = calculateFare(
        segment,
        billableKm,
        days,
        "ALL_INCLUSIVE",
      );
      const exclusion = calculateFare(segment, billableKm, days, "EXCLUSION");

      const buildPaymentTiers = (totalFare: number) => ({
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
      });

      return {
        segment,
        allInclusive: {
          baseFare: Math.round(allInclusive.baseFare),
          driverAllowance: allInclusive.driverAllowance,
          totalFare: Math.round(allInclusive.totalFare),
          paymentTiers: buildPaymentTiers(Math.round(allInclusive.totalFare)),
        },
        exclusion: {
          baseFare: Math.round(exclusion.baseFare),
          driverAllowance: exclusion.driverAllowance,
          totalFare: Math.round(exclusion.totalFare),
          paymentTiers: buildPaymentTiers(Math.round(exclusion.totalFare)),
        },
      };
    });

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
      pricingTier?: "ALL_INCLUSIVE" | "EXCLUSION";
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
      throw new AppError("Invalid vehicle segment for this route", 400);
    }

    const tier = data.pricingTier || "ALL_INCLUSIVE";
    const trustedTotalFare =
      segmentEstimate[tier === "ALL_INCLUSIVE" ? "allInclusive" : "exclusion"]
        .totalFare;

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
          pricingTier: tier,
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
      throw new AppError("Driver profile not found", 404);
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
      throw new AppError("KYC verification required", 403);
    }

    const updateRes = await prisma.trip.updateMany({
      where: { id: tripId, status: TripStatus.CONFIRMED, driverId: null },
      data: { driverId: driver.id, status: TripStatus.DRIVER_ASSIGNED },
    });

    if (updateRes.count === 0) {
      throw new AppError("Job no longer available.", 410);
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

    if (!trip) throw new AppError("Trip not found", 404);
    if (trip.driver?.userId !== driverUserId)
      throw new AppError("Unauthorized driver", 403);
    if (trip.startOtp !== otp) throw new AppError("Invalid OTP", 400);

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
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { payments: true, driver: { include: { user: true } } },
    });

    if (!trip) throw new AppError("Trip not found", 404);
    if (trip.userId !== customerId) throw new AppError("Unauthorized", 403);

    if (
      trip.status !== TripStatus.PENDING_PAYMENT &&
      trip.status !== TripStatus.CONFIRMED &&
      trip.status !== TripStatus.DRIVER_ASSIGNED
    ) {
      throw new AppError("Trip cannot be cancelled at this stage", 400);
    }

    const upfrontPayment = trip.payments.find(
      (p) => p.type === PaymentType.UPFRONT,
    );

    if (
      (trip.status === TripStatus.CONFIRMED ||
        trip.status === TripStatus.DRIVER_ASSIGNED) &&
      upfrontPayment?.razorpayPaymentId
    ) {
      const paymentsService =
        new (require("../payments/payments.service").PaymentsService)();
      const refundAmount = upfrontPayment.amount
        ? upfrontPayment.amount * 0.95
        : undefined; // 95% refund, 5% charge
      await paymentsService.processRefund(
        upfrontPayment.razorpayPaymentId,
        refundAmount,
      );

      await prisma.payment.update({
        where: { id: upfrontPayment.id },
        data: { status: "REFUNDED" },
      });
    }

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
    if (!trip) throw new AppError("Trip not found", 404);
    return trip;
  },
};
