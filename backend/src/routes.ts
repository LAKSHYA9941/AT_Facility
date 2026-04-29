import { FastifyInstance } from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";

export const registerRoutes = async (app: FastifyInstance) => {
  app.register(authRoutes, { prefix: "/api/auth" });
  // more modules registered here as we build them
};
