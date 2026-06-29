import { FastifyRequest, FastifyReply } from "fastify";
import { tripsService } from "./trips.service";
import { sendSuccess, sendCreated } from "../../shared/utils/response";
import { JWTPayload } from "../../shared/types";
import { AppError } from "../../shared/utils/errors";

export const tripsController = {
  // ── Customer: estimate fare ─────────────────────────────────

  estimate: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const {
      tripType,
      waypoints,
      pickupAddress,
      destinations,
      distanceKm,
      startDate,
      endDate,
      passengerCount,
    } = req.body as any;

    const result = await tripsService.estimate({
      tripType,
      waypoints,
      pickupAddress,
      destinations,
      distanceKm,
      startDate,
      endDate,
      passengerCount,
    });

    return sendSuccess(reply, result, "Trip fare estimated");
  },

  // ── Customer: create trip ───────────────────────────────────

  create: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user as JWTPayload;
    const body = req.body as any;

    let waypoints = body.waypoints;
    if (body.pickupAddress && body.destinations) {
      waypoints = [
        {
          address: body.pickupAddress,
          lat: body.pickupLat,
          lng: body.pickupLng,
        },
        ...body.destinations,
      ];
    }

    const trip = await tripsService.create(user.userId, {
      tripType: body.tripType,
      waypoints,
      startDate: body.startDate,
      endDate: body.endDate,
      passengerCount: body.passengerCount,
      vehicleSegment: body.vehicleSegment,
      pricingTier: body.pricingTier,
      totalFare: body.totalFare,
      selectedPercentage: body.selectedPercentage,
    });

    return sendCreated(reply, trip, "Trip created");
  },

  // ── Customer: get my trips ──────────────────────────────────

  getMyTrips: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const { page, limit } = req.query as { page?: string; limit?: string };

    const result = await tripsService.getCustomerTrips(
      user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );

    return sendSuccess(reply, result);
  },

  // ── Get trip by ID ──────────────────────────────────────────

  getById: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };

    const trip = await tripsService.getById(id, user.userId);
    return sendSuccess(reply, trip);
  },

  // ── Customer: cancel trip ───────────────────────────────────

  cancelByCustomer: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };
    const { reason } = req.body as any;

    const trip = await tripsService.cancelByCustomer(id, user.userId, reason);
    return sendSuccess(reply, trip, "Trip cancelled");
  },

  // ── Driver: get available jobs ──────────────────────────────

  getAvailableJobs: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const trips = await tripsService.getAvailableJobs(user.userId);
    return sendSuccess(reply, trips, "Available jobs retrieved");
  },

  // ── Driver: accept trip ─────────────────────────────────────

  accept: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };

    const trip = await tripsService.accept(id, user.userId);
    return sendSuccess(reply, trip, "Trip accepted");
  },

  // ── Driver: mark enroute ────────────────────────────────────

  markEnroute: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };

    const trip = await tripsService.markEnroute(id, user.userId);
    return sendSuccess(reply, trip, "Heading to pickup");
  },

  // ── Driver: start trip ──────────────────────────────────────

  start: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };
    const { otp } = req.body as { otp: string };

    if (!otp) {
      throw new AppError("OTP is required", 400);
    }

    const trip = await tripsService.start(id, user.userId, otp);
    return sendSuccess(reply, trip, "Trip started");
  },

  // ── Driver: complete trip ───────────────────────────────────

  complete: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };

    const result = await tripsService.complete(id, user.userId);
    return sendSuccess(reply, result, "Trip completed");
  },

  // ── Driver: cancel trip ─────────────────────────────────────

  cancelByDriver: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const { id } = req.params as { id: string };
    const { reason } = req.body as any;

    const trip = await tripsService.cancelByDriver(id, user.userId, reason);
    return sendSuccess(reply, trip, "Trip cancelled, finding new driver");
  },

  // ── Driver: get my trips ───────────────────────────────────

  getDriverTrips: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = req.user as JWTPayload;
    const { page, limit } = req.query as { page?: string; limit?: string };

    const result = await tripsService.getDriverTrips(
      user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );

    return sendSuccess(reply, result);
  },
};
