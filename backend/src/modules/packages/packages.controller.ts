import { FastifyRequest, FastifyReply } from "fastify";
import { PackagesService } from "./packages.service";
import { PackageCategory } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";

const packagesService = new PackagesService();

export class PackagesController {
  listPackages = async (
    req: FastifyRequest<{ Querystring: { category?: PackageCategory } }>,
    reply: FastifyReply,
  ) => {
    try {
      const data = await packagesService.listPackages(req.query.category);
      return sendSuccess(reply, data, "Packages retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getPackage = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = req.params;
      const data = await packagesService.getPackage(id);
      return sendSuccess(reply, data, "Package details retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  bookPackage = async (
    req: FastifyRequest<{
      Params: { id: string };
      Body: { travelDate: string; numPeople: number };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params;
      const { travelDate, numPeople } = req.body;

      if (!travelDate || !numPeople)
        return sendError(reply, "travelDate and numPeople are required");

      const data = await packagesService.bookPackage(
        user.userId,
        id,
        travelDate,
        numPeople,
      );
      return sendCreated(reply, data, "Package booked successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getMyBookings = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await packagesService.getMyBookings(user.userId);
      return sendSuccess(reply, data, "My bookings retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  cancelBooking = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { id } = req.params;
      const data = await packagesService.cancelBooking(user.userId, id);
      return sendSuccess(reply, data, "Booking cancelled successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
