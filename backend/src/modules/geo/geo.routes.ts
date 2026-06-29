import { FastifyInstance } from "fastify";
import { geoController } from "./geo.controller";
import { authGuard } from "../../shared/middleware/auth.guard";

export const geoRoutes = async (app: FastifyInstance) => {
  // All geo routes require a valid auth token to prevent public abuse
  app.get(
    "/autocomplete",
    { preHandler: [authGuard] },
    geoController.autocomplete,
  );
  app.post("/routing", { preHandler: [authGuard] }, geoController.routing);
  app.get("/reverse", { preHandler: [authGuard] }, geoController.reverse);
};
