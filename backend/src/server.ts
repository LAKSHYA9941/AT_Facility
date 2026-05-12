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

            const activeRide = await prisma.ride.findFirst({
              where: {
                driverId: driver.id,
                status: { in: ["CONFIRMED", "ARRIVING", "IN_RIDE"] },
              },
            });
            if (activeRide) {
              io.to(`user:${activeRide.customerId}`).emit(
                SOCKET_EVENTS.RIDE_DRIVER_LOCATION,
                { lat: data.lat, lng: data.lng, heading: data.heading },
              );
            }
          } catch (err) {
            console.error("Location error:", err);
          }
        },
      );

      // ── DRIVER ACCEPT ───────────────────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_ACCEPT,
        async (data: { rideId: string }) => {
          if (role !== Role.DRIVER) return;
          try {
            const driver = await prisma.driverProfile.findUnique({
              where: { userId },
              include: { user: true, vehicle: true },
            });
            if (!driver) return;

            const ride = await prisma.ride.update({
              where: { id: data.rideId },
              data: {
                driverId: driver.id,
                status: "CONFIRMED",
                acceptedAt: new Date(),
              },
            });

            await prisma.driverProfile.update({
              where: { id: driver.id },
              data: { isAvailable: false },
            });

            io.to(`user:${ride.customerId}`).emit(SOCKET_EVENTS.RIDE_ASSIGNED, {
              rideId: ride.id,
              driver: {
                name: driver.user.name,
                phone: driver.user.phone,
                rating: driver.rating,
              },
              vehicle: driver.vehicle
                ? {
                    make: driver.vehicle.make,
                    model: driver.vehicle.model,
                    color: driver.vehicle.color,
                    plateNumber: driver.vehicle.plateNumber,
                  }
                : null,
            });
            console.log(`✅ Ride ${data.rideId} accepted by ${userId}`);
          } catch (err) {
            console.error("Accept error:", err);
          }
        },
      );

      // ── DRIVER DECLINE ──────────────────────────────────
      socket.on(SOCKET_EVENTS.DRIVER_DECLINE, (data: { rideId: string }) => {
        console.log(`❌ Ride ${data.rideId} declined by ${userId}`);
      });

      // ── DRIVER ARRIVED ──────────────────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_ARRIVED,
        async (data: { rideId: string }) => {
          if (role !== Role.DRIVER) return;
          try {
            const ride = await prisma.ride.update({
              where: { id: data.rideId },
              data: { status: "ARRIVING", arrivedAt: new Date() },
            });
            io.to(`user:${ride.customerId}`).emit(
              SOCKET_EVENTS.RIDE_DRIVER_ARRIVED,
              { rideId: ride.id },
            );
          } catch (err) {
            console.error("Arrived error:", err);
          }
        },
      );

      // ── DRIVER STARTED ──────────────────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_STARTED,
        async (data: { rideId: string; otp: string }) => {
          if (role !== Role.DRIVER) return;
          try {
            const ride = await prisma.ride.findUnique({
              where: { id: data.rideId },
            });
            if (!ride || ride.otp !== data.otp) {
              socket.emit(SOCKET_EVENTS.ERROR, { message: "Invalid OTP" });
              return;
            }
            const updated = await prisma.ride.update({
              where: { id: data.rideId },
              data: { status: "IN_RIDE", startedAt: new Date() },
            });
            io.to(`user:${updated.customerId}`).emit(
              SOCKET_EVENTS.RIDE_STARTED,
              { rideId: updated.id },
            );
          } catch (err) {
            console.error("Start error:", err);
          }
        },
      );

      // ── DRIVER COMPLETED ────────────────────────────────
      socket.on(
        SOCKET_EVENTS.DRIVER_COMPLETED,
        async (data: { rideId: string }) => {
          if (role !== Role.DRIVER) return;
          try {
            const driver = await prisma.driverProfile.findUnique({
              where: { userId },
            });
            const ride = await prisma.ride.findUnique({
              where: { id: data.rideId },
            });
            if (!driver || !ride) return;

            const commission = parseFloat((ride.totalFare * 0.2).toFixed(2));
            const net = parseFloat((ride.totalFare - commission).toFixed(2));

            const [updated] = await Promise.all([
              prisma.ride.update({
                where: { id: data.rideId },
                data: { status: "COMPLETED", completedAt: new Date() },
              }),
              prisma.earning.create({
                data: {
                  driverId: driver.id,
                  rideId: data.rideId,
                  gross: ride.totalFare,
                  commission,
                  net,
                },
              }),
              prisma.driverProfile.update({
                where: { id: driver.id },
                data: {
                  isAvailable: true,
                  totalTrips: { increment: 1 },
                  totalEarnings: { increment: net },
                },
              }),
            ]);

            io.to(`user:${updated.customerId}`).emit(
              SOCKET_EVENTS.RIDE_COMPLETED,
              {
                rideId: updated.id,
                fare: updated.totalFare,
                earnings: { gross: ride.totalFare, commission, net },
              },
            );
            io.to("role:ADMIN").emit(SOCKET_EVENTS.ADMIN_STATS, {
              event: "ride_completed",
              fare: ride.totalFare,
            });
            console.log(`✅ Ride ${data.rideId} completed`);
          } catch (err) {
            console.error("Complete error:", err);
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
