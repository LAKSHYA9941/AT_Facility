import { buildApp } from "./app";
import { prisma } from "./shared/db/prisma";
import { redis } from "./shared/redis/redis";

const start = async () => {
  try {
    const app = await buildApp();
    const port = parseInt(process.env.PORT || "3000");

    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
};

start();
