import { FastifyRequest, FastifyReply } from "fastify";
import { tripsService } from "./trips.service";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";
import { VehicleSegment } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";
import prisma from "../../shared/db/prisma";

export const tripsController = {
  // ── Customer: estimate fare ─────────────────────────────────

  estimate: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        passengerCount,
        startDate,
        endDate,
        isRoundTrip,
        preferredSegment,
      } = req.body as any;

      const result = await tripsService.estimate(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        passengerCount,
        startDate,
        endDate,
        isRoundTrip,
        preferredSegment,
      );

      return sendSuccess(reply, result, "Trip fare estimated");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Customer: create trip ───────────────────────────────────

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const body = req.body as any;

      const trip = await tripsService.create(user.userId, {
        pickupAddress: body.pickupAddress,
        pickupLat: body.pickupLat,
        pickupLng: body.pickupLng,
        dropAddress: body.dropAddress,
        dropLat: body.dropLat,
        dropLng: body.dropLng,
        passengerCount: body.passengerCount,
        startDate: body.startDate,
        endDate: body.endDate,
        isRoundTrip: body.isRoundTrip,
        preferredSegment: body.preferredSegment,
        waypoints: body.waypoints,
      });

      return sendCreated(reply, trip, "Trip created");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Customer: get my trips ──────────────────────────────────

  getMyTrips: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { page, limit } = req.query as { page?: string; limit?: string };

      const result = await tripsService.getCustomerTrips(
        user.userId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
      );

      return sendSuccess(reply, result);
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Get trip by ID ──────────────────────────────────────────

  getById: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      const trip = await tripsService.getById(id, user.userId);
      return sendSuccess(reply, trip);
    } catch (err: any) {
      if (err.message === "Trip not found") return sendNotFound(reply);
      return sendError(reply, err.message);
    }
  },

  // ── Customer: cancel trip ───────────────────────────────────

  cancelByCustomer: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const { reason } = req.body as any;

      const trip = await tripsService.cancelByCustomer(id, user.userId, reason);
      return sendSuccess(reply, trip, "Trip cancelled");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: get open jobs ───────────────────────────────────

  getOpenJobs: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;

      const driver = await prisma.driverProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!driver) return sendError(reply, "Driver profile not found");
      if (!driver.segment)
        return sendError(reply, "Driver vehicle segment not set");

      const trips = await tripsService.getOpenJobs(
        driver.segment as VehicleSegment,
      );
      return sendSuccess(reply, trips, "Open jobs retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: accept trip ─────────────────────────────────────

  accept: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      const trip = await tripsService.accept(id, user.userId);
      return sendSuccess(reply, trip, "Trip accepted");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: mark enroute ────────────────────────────────────

  markEnroute: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      const trip = await tripsService.markEnroute(id, user.userId);
      return sendSuccess(reply, trip, "Heading to pickup");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: start trip ──────────────────────────────────────

  start: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      const trip = await tripsService.start(id, user.userId);
      return sendSuccess(reply, trip, "Trip started");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: complete trip ───────────────────────────────────

  complete: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      const result = await tripsService.complete(id, user.userId);
      return sendSuccess(reply, result, "Trip completed");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: cancel trip ─────────────────────────────────────

  cancelByDriver: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const { reason } = req.body as any;

      const trip = await tripsService.cancelByDriver(id, user.userId, reason);
      return sendSuccess(reply, trip, "Trip cancelled, finding new driver");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  // ── Driver: get my trips ───────────────────────────────────

  getDriverTrips: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { page, limit } = req.query as { page?: string; limit?: string };

      const result = await tripsService.getDriverTrips(
        user.userId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
      );

      return sendSuccess(reply, result);
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },
};
