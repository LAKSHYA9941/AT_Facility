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
      const { tripType, waypoints, startDate, endDate, passengerCount } =
        req.body as any;

      const result = await tripsService.estimate({
        tripType,
        waypoints,
        startDate,
        endDate,
        passengerCount,
      });

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
        tripType: body.tripType,
        waypoints: body.waypoints,
        startDate: body.startDate,
        endDate: body.endDate,
        passengerCount: body.passengerCount,
        vehicleSegment: body.vehicleSegment,
        totalFare: body.totalFare,
        selectedPercentage: body.selectedPercentage,
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

  // ── Driver: get available jobs ──────────────────────────────

  getAvailableJobs: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const trips = await tripsService.getAvailableJobs(user.userId);
      return sendSuccess(reply, trips, "Available jobs retrieved");
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
      const { otp } = req.body as { otp: string };

      if (!otp) return sendError(reply, "OTP is required");

      const trip = await tripsService.start(id, user.userId, otp);
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
