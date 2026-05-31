import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { errorHandler } from "./shared/middleware/error.handler";
import { registerRoutes } from "./routes";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { logger } from "./shared/logger/logger";
import dotenv from "dotenv";

dotenv.config();

export const buildApp = async () => {
  const app = Fastify({
    loggerInstance: logger as any,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
  });

  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET!,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Routes
  await registerRoutes(app);

  return app;
};
