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
}
