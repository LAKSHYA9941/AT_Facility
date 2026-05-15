import { FastifyRequest, FastifyReply } from "fastify";
import { RentalsService } from "./rentals.service";
import { JWTPayload } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../shared/utils/response";

const rentalsService = new RentalsService();

export interface CreateRentalBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  withDriver: boolean;
}

export class RentalsController {
  getAvailableVehicles = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await rentalsService.getAvailableVehicles();
      return sendSuccess(reply, data, "Vehicles retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  createRental = async (
    req: FastifyRequest<{ Body: CreateRentalBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const {
        vehicleId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        withDriver,
      } = req.body;

      if (
        !vehicleId ||
        !startDate ||
        !endDate ||
        !pickupLocation ||
        !returnLocation
      ) {
        return sendError(
          reply,
          "vehicleId, startDate, endDate, pickupLocation, and returnLocation are required",
        );
      }

      const data = await rentalsService.createRental(
        user.userId,
        vehicleId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        withDriver || false,
      );

      return sendCreated(reply, data, "Rental created successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getMyRentals = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await rentalsService.getMyRentals(user.userId);
      return sendSuccess(reply, data, "My rentals retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  cancelRental = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params;
      const data = await rentalsService.cancelRental(user.userId, id);
      return sendSuccess(reply, data, "Rental cancelled successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
