import { FastifyRequest, FastifyReply } from "fastify";
import { RentalsService } from "./rentals.service";
import { JWTPayload } from "../../shared/types";

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
      return reply.send({ success: true, message: "Vehicles retrieved", data });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
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
        throw new Error(
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

      return reply.send({
        success: true,
        message: "Rental created successfully",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getMyRentals = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await rentalsService.getMyRentals(user.userId);
      return reply.send({
        success: true,
        message: "My rentals retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
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
      return reply.send({
        success: true,
        message: "Rental cancelled successfully",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };
}
