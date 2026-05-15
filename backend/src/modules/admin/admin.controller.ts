import { FastifyRequest, FastifyReply } from "fastify";
import { AdminService } from "./admin.service";
import { JWTPayload } from "../../shared/types";
import {
  sendSuccess,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";

const adminService = new AdminService();

export class AdminController {
  getCustomerIdQueue = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await adminService.getCustomerIdQueue();
      return sendSuccess(reply, data, "Customer ID queue retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  approveCustomerId = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const adminUser = req.user as JWTPayload;
      const { userId } = req.params;
      const data = await adminService.approveCustomerId(
        userId,
        adminUser.userId,
      );
      return sendSuccess(reply, data, "Customer ID approved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  rejectCustomerId = async (
    req: FastifyRequest<{
      Params: { userId: string };
      Body: { reason: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      if (!reason) return sendError(reply, "Reason is required");
      const data = await adminService.rejectCustomerId(userId, reason);
      return sendSuccess(reply, data, "Customer ID rejected");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getKycQueue = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await adminService.getKycQueue();
      return sendSuccess(reply, data, "KYC queue retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getKycDetails = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.getKycDetails(driverId);
      if (!data) return sendNotFound(reply, "Driver not found");
      return sendSuccess(reply, data, "KYC details retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
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
      return sendSuccess(reply, data, "Document approved");
    } catch (err: any) {
      return sendError(reply, err.message);
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
      if (!rejectReason) return sendError(reply, "Reject reason is required");
      const data = await adminService.rejectDocument(
        driverId,
        docId,
        rejectReason,
      );
      return sendSuccess(reply, data, "Document rejected");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  approveDriverKyc = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.approveDriverKyc(driverId);
      return sendSuccess(reply, data, "Driver KYC approved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  rejectDriverKyc = async (
    req: FastifyRequest<{ Params: { driverId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { driverId } = req.params;
      const data = await adminService.rejectDriverKyc(driverId);
      return sendSuccess(reply, data, "Driver KYC rejected");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  approvePackageBooking = async (
    req: FastifyRequest<{ Params: { bookingId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { bookingId } = req.params;
      const data = await adminService.approvePackageBooking(bookingId);
      return sendSuccess(reply, data, "Package booking confirmed");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getDashboardStats = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await adminService.getDashboardStats();
      return sendSuccess(reply, data, "Dashboard stats retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
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
      return sendSuccess(reply, data, "Customers retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
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
      return sendSuccess(reply, data, "Drivers retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  toggleUserBan = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = req.params;
      const data = await adminService.toggleUserBan(userId);
      return sendSuccess(reply, data, `User status updated to ${data.status}`);
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
