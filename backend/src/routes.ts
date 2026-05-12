import { FastifyInstance } from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import { ridesRoutes } from "./modules/rides/rides.routes";

export const registerRoutes = async (app: FastifyInstance) => {
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(ridesRoutes, { prefix: "/api/rides" });
};
