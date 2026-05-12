import { FastifyRequest, FastifyReply } from "fastify";
import { PackagesService } from "./packages.service";
import { PackageCategory } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";

const packagesService = new PackagesService();

export class PackagesController {
  listPackages = async (
    req: FastifyRequest<{ Querystring: { category?: PackageCategory } }>,
    reply: FastifyReply,
  ) => {
    try {
      const data = await packagesService.listPackages(req.query.category);
      return reply.send({ success: true, message: "Packages retrieved", data });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getPackage = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = req.params;
      const data = await packagesService.getPackage(id);
      return reply.send({
        success: true,
        message: "Package details retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
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
        throw new Error("travelDate and numPeople are required");

      const data = await packagesService.bookPackage(
        user.userId,
        id,
        travelDate,
        numPeople,
      );
      return reply.send({
        success: true,
        message: "Package booked successfully",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getMyBookings = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await packagesService.getMyBookings(user.userId);
      return reply.send({
        success: true,
        message: "My bookings retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
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
      return reply.send({
        success: true,
        message: "Booking cancelled successfully",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };
}
