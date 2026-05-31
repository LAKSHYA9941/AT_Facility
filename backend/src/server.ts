import { buildApp } from "./app";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./shared/db/prisma";
import { redis } from "./shared/redis/redis";
import { setIO } from "./shared/socket/socket";
import { LocationRedis } from "./shared/redis/redis";
import { SOCKET_EVENTS } from "./shared/socket/socket.events";
import { Role } from "./shared/types/enums";
import { JWTPayload } from "./shared/types";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logger } from "./shared/logger/logger";
import { setupTripsGateway } from "./modules/trips/trips.gateway";

dotenv.config();

// Start server entry point
const start = async () => {
  try {
    const requiredEnvVars = [
      "DATABASE_URL",
      "JWT_ACCESS_SECRET",
      "AWS_BUCKET_NAME",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "FIREBASE_PROJECT_ID",
      "GOOGLE_MAPS_API_KEY",
    ];
    const missing = requiredEnvVars.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `FATAL: Missing environment variables: ${missing.join(", ")}`,
      );
      process.exit(1);
    }

    const app = await buildApp();
    const port = parseInt(process.env.PORT || "4000");

    await app.listen({ port, host: "0.0.0.0" });
    logger.info(`🚀 Server running on port ${port}`);
    logger.info(`📡 Health: http://localhost:${port}/health`);

    // Attach Socket.io AFTER Fastify is listening
    const io = new SocketServer(app.server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    });

    // Make io available to other modules
    setIO(io);

    // JWT auth middleware
    io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(" ")[1];
        if (!token) return next(new Error("Authentication required"));
        const payload = jwt.verify(
          token,
          process.env.JWT_ACCESS_SECRET!,
        ) as JWTPayload;
        socket.data.userId = payload.userId;
        socket.data.role = payload.role;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", async (socket) => {
      const { userId, role } = socket.data;
      logger.info({ role, userId }, `🔌 Connected`);

      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
      socket.emit(SOCKET_EVENTS.CONNECTED, {
        message: "Connected to At Facility",
      });

      // Delegate all trip/driver logic to the gateway
      setupTripsGateway(io, socket);
    });

    logger.info(`🔌 Socket.io ready`);
  } catch (err) {
    logger.error({ err }, "❌ Server failed to start");
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
};

start();
