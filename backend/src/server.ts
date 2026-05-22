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

dotenv.config();

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
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📡 Health: http://localhost:${port}/health`);

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
      console.log(`🔌 Connected: ${role} ${userId}`);

      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
      socket.emit(SOCKET_EVENTS.CONNECTED, {
        message: "Connected to At Facility",
      });

      // ── DRIVER ONLINE ──────────────────────────────────
      socket.on(SOCKET_EVENTS.DRIVER_ONLINE, async () => {
        if (role !== Role.DRIVER) return;
        try {
          const driver = await prisma.driverProfile.findUnique({
            where: { userId },
          });
          if (!driver || driver.kycStatus !== "VERIFIED") {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "KYC not verified" });
            return;
          }
          await prisma.driverProfile.update({
            where: { userId },
            data: { isOnline: true, isAvailable: true },
          });
          socket.join("drivers:online");
          console.log(`✅ Driver online: ${userId}`);
        } catch (err) {
          console.error("Driver online error:", err);
        }
      });

      // ── DRIVER OFFLINE ─────────────────────────────────
      socket.on(SOCKET_EVENTS.DRIVER_OFFLINE, async () => {
        if (role !== Role.DRIVER) return;
        try {
          await prisma.driverProfile.update({
            where: { userId },
            data: { isOnline: false, isAvailable: false },
          });
          await LocationRedis.delete(userId);
          socket.leave("drivers:online");
          console.log(`🔴 Driver offline: ${userId}`);
        } catch (err) {
          console.error("Driver offline error:", err);
        }
      });

      // ── DRIVER LOCATION (every 4s) ──────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_LOCATION,
        async (data: { lat: number; lng: number; heading?: number }) => {
          if (role !== Role.DRIVER) return;
          try {
            const driver = await prisma.driverProfile.findUnique({
              where: { userId },
            });
            if (!driver) return;

            await LocationRedis.set(driver.id, data.lat, data.lng);

            const now = new Date();
            const secondsSince = driver.lastLocationAt
              ? (now.getTime() - driver.lastLocationAt.getTime()) / 1000
              : 999;

            if (secondsSince > 30) {
              await prisma.driverProfile.update({
                where: { id: driver.id },
                data: {
                  currentLat: data.lat,
                  currentLng: data.lng,
                  lastLocationAt: now,
                },
              });
            }

            const activeTrip = await prisma.trip.findFirst({
              where: {
                driverId: driver.id,
                status: { in: ["DRIVER_ASSIGNED", "ACTIVE"] },
              },
            });
            if (activeTrip) {
              io.to(`user:${activeTrip.userId}`).emit("trip:driver_location", {
                lat: data.lat,
                lng: data.lng,
                heading: data.heading,
              });
            }
          } catch (err) {
            console.error("Location error:", err);
          }
        },
      );

      // ── DRIVER ACCEPT JOB (Phase 5) ─────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_ACCEPT_JOB,
        async ({ tripId, driverId }) => {
          if (role !== Role.DRIVER) return;
          try {
            // 1. Verify driver KYC status
            const driver = await prisma.driverProfile.findUnique({
              where: { id: driverId },
              include: { user: true },
            });
            if (!driver || driver.kycStatus !== "VERIFIED") {
              socket.emit(SOCKET_EVENTS.ERROR, {
                message: "KYC not approved. You cannot accept jobs.",
              });
              return;
            }

            // 2. Atomic check-and-assign
            const tripUpdateRes = await prisma.trip.updateMany({
              where: { id: tripId, status: "CONFIRMED", driverId: null },
              data: { driverId, status: "DRIVER_ASSIGNED" },
            });

            if (tripUpdateRes.count === 0) {
              socket.emit(SOCKET_EVENTS.ERROR, {
                message: "Job no longer available.",
              });
              return;
            }

            // 3. Fetch the updated trip with driver details for the customer
            const updatedTrip = await prisma.trip.findUnique({
              where: { id: tripId },
              include: {
                driver: { include: { user: true, vehicle: true } },
                waypoints: true,
              },
            });

            if (!updatedTrip) return;

            // 4. Emit to the specific customer
            io.to(`user:${updatedTrip.userId}`).emit(
              SOCKET_EVENTS.DRIVER_ASSIGNED,
              {
                driverId: driver.id,
                driverName: updatedTrip.driver?.user?.name,
                driverPhoto: null, // Add photo logic if needed
                vehiclePlate: updatedTrip.driver?.vehicle?.plateNumber,
                phone: updatedTrip.driver?.user?.phone,
              },
            );
            io.to(`user:${updatedTrip.userId}`).emit(
              SOCKET_EVENTS.TRIP_STATUS_UPDATED,
              { status: "DRIVER_ASSIGNED" },
            );

            // 5. Notify other drivers the job is gone
            socket.broadcast.emit("trip:job_taken", { tripId }); // using broadcast or io.emit
          } catch (err) {
            console.error("Accept job error:", err);
          }
        },
      );

      // ── DISCONNECT ──────────────────────────────────────
      socket.on("disconnect", async () => {
        console.log(`🔌 Disconnected: ${role} ${userId}`);
        if (role === Role.DRIVER) {
          try {
            await prisma.driverProfile.update({
              where: { userId },
              data: { isOnline: false, isAvailable: false },
            });
            await LocationRedis.delete(userId);
          } catch {}
        }
      });
    });

    console.log(`🔌 Socket.io ready`);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
};

start();
