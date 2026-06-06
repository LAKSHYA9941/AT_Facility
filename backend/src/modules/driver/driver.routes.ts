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

  app.get(
    "/vehicle",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    driverController.getVehicle,
  );
};
