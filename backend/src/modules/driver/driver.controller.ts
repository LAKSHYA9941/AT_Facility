import { FastifyRequest, FastifyReply } from "fastify";
import { DriverService } from "./driver.service";
import { JWTPayload } from "../../shared/types";
import { sendSuccess, sendError } from "../../shared/utils/response";
import { VehicleSegment } from "../../shared/types/enums";

const driverService = new DriverService();

export class DriverController {
  upsertVehicle = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = req.body as {
        make: string;
        model: string;
        color: string;
        year: number;
        plateNumber: string;
        registrationNumber: string;
        segment: VehicleSegment;
        maxCapacity: number;
      };

      const vehicle = await driverService.upsertVehicle(user.userId, data);
      return sendSuccess(reply, vehicle, "Vehicle details saved successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  toggleStatus = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { isOnline } = req.body as { isOnline: boolean };
      const result = await driverService.toggleStatus(user.userId, isOnline);
      return sendSuccess(
        reply,
        { isOnline: result.isOnline },
        "Status updated successfully",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getVehicle = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const vehicle = await driverService.getVehicle(user.userId);
      return sendSuccess(
        reply,
        vehicle,
        "Vehicle details fetched successfully",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getEarnings = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const earnings = await driverService.getEarnings(user.userId);
      return sendSuccess(reply, earnings, "Earnings fetched successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getEarningsHistory = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const history = await driverService.getEarningsHistory(user.userId);
      return sendSuccess(
        reply,
        history,
        "Earnings history fetched successfully",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
