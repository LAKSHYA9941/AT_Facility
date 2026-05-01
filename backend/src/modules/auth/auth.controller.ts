import { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "./auth.service";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../shared/utils/response";
import { Role } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";

export const authController = {
  sendOtp: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { phone, role } = req.body as { phone: string; role?: string };
      const result = await authService.sendOtp(phone, role);
      return sendSuccess(reply, result, "OTP sent successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  verifyOtp: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { phone, otp, deviceId, deviceName, role } = req.body as {
        phone: string;
        otp: string;
        deviceId: string;
        deviceName?: string;
        role?: Role;
      };

      const result = await authService.verifyOtp(
        phone,
        otp,
        deviceId,
        deviceName || "Unknown device",
        role || Role.CUSTOMER,
      );

      return sendSuccess(
        reply,
        result,
        result.isNewUser ? "Account created" : "Login successful",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  completeProfile: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { name, email } = req.body as { name: string; email?: string };
      const result = await authService.completeProfile(
        user.userId,
        name,
        email,
      );
      return sendSuccess(reply, result, "Profile completed");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  refresh: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken, deviceId } = req.body as {
        refreshToken: string;
        deviceId: string;
      };
      const result = await authService.refresh(refreshToken, deviceId);
      return sendSuccess(reply, result, "Token refreshed");
    } catch (err: any) {
      return sendError(reply, err.message, 401);
    }
  },

  logout: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      await authService.logout(refreshToken);
      return sendSuccess(reply, null, "Logged out successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  logoutAll: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      await authService.logoutAll(user.userId);
      return sendSuccess(reply, null, "Logged out from all devices");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  adminLogin: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, deviceId, deviceName } = req.body as {
        email: string;
        password: string;
        deviceId: string;
        deviceName?: string;
      };
      const result = await authService.adminLogin(
        email,
        password,
        deviceId,
        deviceName || "Unknown device",
      );
      return sendSuccess(reply, result, "Admin login successful");
    } catch (err: any) {
      return sendError(reply, err.message, 401);
    }
  },
};
