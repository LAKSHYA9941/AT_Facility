import { FastifyInstance } from "fastify";
import { DriverController } from "./driver.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";

const driverController = new DriverController();

export const driverRoutes = async (app: FastifyInstance) => {
  app.post(
    "/vehicle",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.upsertVehicle,
  );

  app.post(
    "/status",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.toggleStatus,
  );

  app.get(
    "/vehicle",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.getVehicle,
  );
  app.get(
    "/earnings",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.getEarnings,
  );

  app.get(
    "/earnings/history",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.getEarningsHistory,
  );
};
