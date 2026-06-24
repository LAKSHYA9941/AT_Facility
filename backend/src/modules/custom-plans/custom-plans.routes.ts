// backend/src/modules/custom-plans/custom-plans.routes.ts
import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";
import {
  submitCustomPlan,
  listCustomPlans,
  getCustomPlanById,
  updateCustomPlan,
  myCustomPlans,
  assignDriver,
  getAssignedToMe,
} from "./custom-plans.controller";

export async function customPlanRoutes(app: FastifyInstance) {
  // Customer & Driver: submit a plan
  app.post("/custom-plans", { preHandler: [authGuard] }, submitCustomPlan);

  // Customer & Driver: fetch own plans
  app.get("/custom-plans/my", { preHandler: [authGuard] }, myCustomPlans);

  // Driver: fetch custom plans assigned to them by admin
  app.get(
    "/custom-plans/assigned-to-me",
    { preHandler: [authGuard, roleGuard(Role.DRIVER)] },
    getAssignedToMe,
  );

  // Admin: list all plans (paginated + filtered)
  app.get(
    "/admin/custom-plans",
    { preHandler: [authGuard, roleGuard(Role.ADMIN)] },
    listCustomPlans,
  );

  // Admin: single plan detail
  app.get<{ Params: { id: string } }>(
    "/admin/custom-plans/:id",
    { preHandler: [authGuard, roleGuard(Role.ADMIN)] },
    getCustomPlanById,
  );

  // Admin: update status / add quote / notes
  app.put<{ Params: { id: string } }>(
    "/admin/custom-plans/:id",
    { preHandler: [authGuard, roleGuard(Role.ADMIN)] },
    updateCustomPlan,
  );

  // Admin: assign driver to accepted plan
  app.post<{ Params: { id: string } }>(
    "/admin/custom-plans/:id/assign-driver",
    { preHandler: [authGuard, roleGuard(Role.ADMIN)] },
    assignDriver,
  );
}
