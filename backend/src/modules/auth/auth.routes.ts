import { FastifyInstance } from "fastify";
import { authController } from "./auth.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import {
  otpSendLimiter,
  otpVerifyLimiter,
} from "../../shared/middleware/rate-limiters";
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  completeProfileSchema,
  logoutSchema,
} from "./auth.schema";

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  // Public routes — no auth needed, but protected by rate limiting
  app.post(
    "/send-otp",
    {
      preHandler: [otpSendLimiter],
      schema: { body: sendOtpSchema.body },
    },
    authController.sendOtp,
  );

  app.post(
    "/verify-otp",
    {
      preHandler: [otpVerifyLimiter],
      schema: { body: verifyOtpSchema.body },
    },
    authController.verifyOtp,
  );

  app.post(
    "/refresh",
    { schema: { body: refreshSchema.body } },
    authController.refresh,
  );

  // Protected routes — need valid access token
  app.put(
    "/complete-profile",
    { schema: { body: completeProfileSchema.body }, preHandler: [authGuard] },
    authController.completeProfile,
  );

  app.put(
    "/profile",
    { preHandler: [authGuard] },
    authController.updateProfile,
  );

  app.post(
    "/logout",
    { schema: { body: logoutSchema.body }, preHandler: [authGuard] },
    authController.logout,
  );

  app.post(
    "/logout-all",
    { preHandler: [authGuard] },
    authController.logoutAll,
  );

  app.delete("/me", { preHandler: [authGuard] }, authController.deleteAccount);
};
