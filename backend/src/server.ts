import "dotenv/config"; // ← must be FIRST — loads .env before any other import reads process.env
import { buildApp } from "./app";
import { prisma } from "./shared/db/prisma";
import { redis } from "./shared/redis/redis";
import { LocationRedis } from "./shared/redis/redis";
import { Role } from "./shared/types/enums";
import { JWTPayload } from "./shared/types";
import jwt from "jsonwebtoken";
import { logger } from "./shared/logger/logger";

// Start server entry point
const start = async () => {
  try {
    const requiredEnvVars = [
      "DATABASE_URL",
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
      "AWS_BUCKET_NAME",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
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
    logger.info(` Server running on port ${port}`);
    logger.info(` Health: http://localhost:${port}/health`);
  } catch (err) {
    logger.error({ err }, " Server failed to start");
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
};

start();
