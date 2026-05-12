import { FastifyRequest, FastifyReply } from "fastify";
import { AdminService } from "./admin.service";
import { JWTPayload } from "../../shared/types";

const adminService = new AdminService();

export class AdminController {
  getKycQueue = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await adminService.getKycQueue();
      return reply.send({
        success: true,
        message: "KYC queue retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getKycDetails = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.getKycDetails(driverId);
      if (!data) throw new Error("Driver not found");
      return reply.send({
        success: true,
        message: "KYC details retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  approveDocument = async (
    req: FastifyRequest<{ Params: { driverId: string; docId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { driverId, docId } = req.params;
      const data = await adminService.approveDocument(
        driverId,
        docId,
        user.userId,
      );
      return reply.send({ success: true, message: "Document approved", data });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  rejectDocument = async (
    req: FastifyRequest<{
      Params: { driverId: string; docId: string };
      Body: { rejectReason: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId, docId } = req.params;
      const { rejectReason } = req.body;
      if (!rejectReason) throw new Error("Reject reason is required");

      const data = await adminService.rejectDocument(
        driverId,
        docId,
        rejectReason,
      );
      return reply.send({ success: true, message: "Document rejected", data });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  approveDriverKyc = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.approveDriverKyc(driverId);
      return reply.send({
        success: true,
        message: "Driver KYC approved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  rejectDriverKyc = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.rejectDriverKyc(driverId);
      return reply.send({
        success: true,
        message: "Driver KYC rejected",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getDashboardStats = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await adminService.getDashboardStats();
      return reply.send({
        success: true,
        message: "Dashboard stats retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getCustomers = async (
    req: FastifyRequest<{
      Querystring: { page?: string; limit?: string; search?: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const page = parseInt(req.query.page || "1");
      const limit = parseInt(req.query.limit || "10");
      const search = req.query.search;

      const data = await adminService.getCustomers(page, limit, search);
      return reply.send({
        success: true,
        message: "Customers retrieved",
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  getDrivers = async (
    req: FastifyRequest<{
      Querystring: { page?: string; limit?: string; search?: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const page = parseInt(req.query.page || "1");
      const limit = parseInt(req.query.limit || "10");
      const search = req.query.search;

      const data = await adminService.getDrivers(page, limit, search);
      return reply.send({ success: true, message: "Drivers retrieved", data });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };

  toggleUserBan = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = req.params;
      const data = await adminService.toggleUserBan(userId);
      return reply.send({
        success: true,
        message: `User status updated to ${data.status}`,
        data,
      });
    } catch (error: any) {
      return reply
        .status(400)
        .send({ success: false, message: error.message, data: null });
    }
  };
}
