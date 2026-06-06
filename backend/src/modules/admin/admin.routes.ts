import { FastifyInstance } from "fastify";
import { AdminController } from "./admin.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";

export async function adminRoutes(fastify: FastifyInstance) {
  const adminController = new AdminController();
  const preHandler = [authGuard, roleGuard(Role.ADMIN)];

  // ── Customer ID Proofs ──────────────────────────────────────
  fastify.get(
    "/id-proofs/queue",
    { preHandler },
    adminController.getCustomerIdQueue,
  );

  fastify.put<{ Params: { userId: string } }>(
    "/id-proofs/:userId/approve",
    { preHandler },
    adminController.approveCustomerId,
  );

  fastify.put<{ Params: { userId: string }; Body: { reason: string } }>(
    "/id-proofs/:userId/reject",
    { preHandler },
    adminController.rejectCustomerId,
  );

  fastify.get<{ Params: { userId: string }; Querystring: { side?: string } }>(
    "/id-proofs/:userId/view-url",
    { preHandler },
    adminController.getCustomerIdViewUrl,
  );

  // ── KYC Endpoints ──────────────────────────────────────────
  fastify.get("/kyc/queue", { preHandler }, adminController.getKycQueue);

  fastify.get<{ Params: { driverId: string } }>(
    "/kyc/:driverId",
    { preHandler },
    adminController.getKycDetails,
  );

  fastify.put<{ Params: { driverId: string } }>(
    "/kyc/:driverId/approve",
    { preHandler },
    adminController.approveDriverKyc,
  );

  fastify.put<{ Params: { driverId: string } }>(
    "/kyc/:driverId/reject",
    { preHandler },
    adminController.rejectDriverKyc,
  );

  // ── Packages ──────────────────────────────────────────────
  fastify.put<{ Params: { bookingId: string } }>(
    "/packages/bookings/:bookingId/approve",
    { preHandler },
    adminController.approvePackageBooking,
  );

  // ── Dashboard ──────────────────────────────────────────────
  fastify.get(
    "/available-drivers",
    { preHandler },
    adminController.getAvailableDrivers,
  );
  fastify.get("/stats", { preHandler }, adminController.getDashboardStats);
  fastify.get<{ Querystring: { limit?: string } }>(
    "/activity",
    { preHandler },
    adminController.getRecentActivity,
  );

  // ── User Management ──────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>("/users/customers", { preHandler }, adminController.getCustomers);

  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>("/users/drivers", { preHandler }, adminController.getDrivers);

  fastify.put<{ Params: { userId: string } }>(
    "/users/:userId/ban",
    { preHandler },
    adminController.toggleUserBan,
  );

  // ── Map — Active Drivers ──────────────────────────────────
  fastify.get(
    "/drivers/active-locations",
    { preHandler },
    adminController.getActiveDriverLocations,
  );

  // ── Document View URLs ──────────────────────────────────────
}
