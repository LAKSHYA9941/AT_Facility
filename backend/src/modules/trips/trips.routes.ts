import { FastifyInstance } from "fastify";
import { tripsController } from "./trips.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";
import {
  estimateTripSchema,
  createTripSchema,
  cancelTripSchema,
} from "./trips.schema";

export const tripsRoutes = async (app: FastifyInstance) => {
  // ── Customer routes ─────────────────────────────────────────

  // POST /api/trips/estimate — get fare breakdown
  app.post(
    "/estimate",
    {
      schema: { body: estimateTripSchema.body },
      preHandler: [authGuard],
    },
    tripsController.estimate,
  );

  // POST /api/trips/create — create a new trip
  app.post(
    "/create",
    {
      schema: { body: createTripSchema.body },
      preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
    },
    tripsController.create,
  );

  // GET /api/trips/my — customer trip history
  app.get(
    "/my",
    { preHandler: [authGuard, roleGuard(Role.CUSTOMER)] },
    tripsController.getMyTrips,
  );

  // GET /api/trips/:id — get trip details
  app.get("/:id", { preHandler: [authGuard] }, tripsController.getById);

  // PUT /api/trips/:id/cancel — customer cancels trip
  app.put(
    "/:id/cancel",
    {
      schema: { body: cancelTripSchema.body },
      preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
    },
    tripsController.cancelByCustomer,
  );

  // ── Driver routes ───────────────────────────────────────────

  // GET /api/trips/available-jobs — open jobs matching driver segment
  app.get(
    "/available-jobs",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.getAvailableJobs,
  );

  // GET /api/trips/driver/my — driver trip history
  app.get(
    "/driver/my",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.getDriverTrips,
  );

  // POST /api/trips/:id/accept — driver accepts trip
  app.post(
    "/:id/accept",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.accept,
  );

  // POST /api/trips/:id/enroute — driver heading to pickup
  app.post(
    "/:id/enroute",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.markEnroute,
  );

  // POST /api/trips/:id/start — driver starts trip
  app.post(
    "/:id/start",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.start,
  );

  // POST /api/trips/:id/complete — driver completes trip
  app.post(
    "/:id/complete",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    tripsController.complete,
  );

  // POST /api/trips/:id/cancel — driver cancels (goes back to OPEN)
  app.post(
    "/:id/driver-cancel",
    {
      schema: { body: cancelTripSchema.body },
      preHandler: [authGuard, roleGuard(Role.DRIVER)],
    },
    tripsController.cancelByDriver,
  );
};
