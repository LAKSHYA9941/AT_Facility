import { FastifyInstance } from "fastify";
import { ridesController } from "./rides.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";
import {
  estimateSchema,
  createRideSchema,
  startRideSchema,
  cancelRideSchema,
} from "./rides.schema";

export const ridesRoutes = async (app: FastifyInstance) => {
  // Customer routes
  app.post(
    "/estimate",
    { schema: { body: estimateSchema.body }, preHandler: [authGuard] },
    ridesController.estimate,
  );

  app.post(
    "/create",
    {
      schema: { body: createRideSchema.body },
      preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
    },
    ridesController.create,
  );

  app.get("/:id", { preHandler: [authGuard] }, ridesController.getById);

  app.put(
    "/:id/cancel",
    {
      schema: { body: cancelRideSchema.body },
      preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
    },
    ridesController.cancel,
  );

  app.get(
    "/history",
    { preHandler: [authGuard, roleGuard(Role.CUSTOMER)] },
    ridesController.history,
  );

  // Driver routes
  app.post(
    "/:id/accept",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    ridesController.accept,
  );

  app.post(
    "/:id/arrive",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    ridesController.arrive,
  );

  app.post(
    "/:id/start",
    {
      schema: { body: startRideSchema.body },
      preHandler: [authGuard, roleGuard(Role.DRIVER)],
    },
    ridesController.start,
  );

  app.post(
    "/:id/complete",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    ridesController.complete,
  );
};
