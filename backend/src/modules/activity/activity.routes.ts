// backend/src/modules/activity/activity.routes.ts
import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";
import { getActivityFeed } from "./activity.controller";

export async function activityRoutes(app: FastifyInstance) {
  app.get(
    "/activity",
    { preHandler: [authGuard, roleGuard(Role.ADMIN)] },
    getActivityFeed,
  );
}
