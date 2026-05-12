import { FastifyRequest, FastifyReply } from "fastify";
import { ridesService } from "./rides.service";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";
import { VehicleSegment } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";

export const ridesController = {
  estimate: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        segment,
        passengerCount,
      } = req.body as any;
      const result = await ridesService.estimate(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        segment as VehicleSegment,
        passengerCount,
      );
      return sendSuccess(reply, result, "Fare estimated");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const {
        pickupAddress,
        pickupLat,
        pickupLng,
        dropAddress,
        dropLat,
        dropLng,
        segment,
        passengerCount,
        paymentMethod,
      } = req.body as any;

      const ride = await ridesService.create(
        user.userId,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropAddress,
        dropLat,
        dropLng,
        segment as VehicleSegment,
        passengerCount,
        paymentMethod,
      );

      return sendCreated(reply, ride, "Ride created");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  getById: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const ride = await ridesService.getById(id, user.userId);
      return sendSuccess(reply, ride);
    } catch (err: any) {
      if (err.message === "Ride not found") return sendNotFound(reply);
      return sendError(reply, err.message);
    }
  },

  cancel: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const { reason } = req.body as any;
      const ride = await ridesService.cancel(id, user.userId, reason);
      return sendSuccess(reply, ride, "Ride cancelled");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  accept: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };

      // Get driver profile from userId
      const driver = await import("../../shared/db/prisma").then((m) =>
        m.default.driverProfile.findUnique({ where: { userId: user.userId } }),
      );
      if (!driver) return sendError(reply, "Driver profile not found");

      const ride = await ridesService.accept(id, driver.id);
      return sendSuccess(reply, ride, "Ride accepted");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  arrive: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const driver = await import("../../shared/db/prisma").then((m) =>
        m.default.driverProfile.findUnique({ where: { userId: user.userId } }),
      );
      if (!driver) return sendError(reply, "Driver profile not found");
      const ride = await ridesService.arrive(id, driver.id);
      return sendSuccess(reply, ride, "Marked as arrived");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  start: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const { otp } = req.body as { otp: string };
      const driver = await import("../../shared/db/prisma").then((m) =>
        m.default.driverProfile.findUnique({ where: { userId: user.userId } }),
      );
      if (!driver) return sendError(reply, "Driver profile not found");
      const ride = await ridesService.start(id, driver.id, otp);
      return sendSuccess(reply, ride, "Ride started");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  complete: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params as { id: string };
      const driver = await import("../../shared/db/prisma").then((m) =>
        m.default.driverProfile.findUnique({ where: { userId: user.userId } }),
      );
      if (!driver) return sendError(reply, "Driver profile not found");
      const result = await ridesService.complete(id, driver.id);
      return sendSuccess(reply, result, "Ride completed");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  history: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { page, limit } = req.query as { page?: string; limit?: string };
      const result = await ridesService.history(
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
