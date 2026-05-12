import { Server as SocketServer } from "socket.io";
import { createServer } from "http";
import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { SOCKET_EVENTS } from "./socket.events";
import { LocationRedis } from "../redis/redis";
import prisma from "../db/prisma";
import { JWTPayload } from "../types";
import { Role } from "../types/enums";

export let io: SocketServer;

export const setIO = (instance: SocketServer) => {
  io = instance;
};

export const sendRideRequest = (driverUserId: string, rideData: object) => {
  if (io) {
    io.to(`user:${driverUserId}`).emit(SOCKET_EVENTS.RIDE_REQUEST, rideData);
  }
};

export const initSocket = (app: FastifyInstance) => {
  // Attach Socket.io directly to Fastify's own http.Server.
  // Do NOT wrap it in createServer() — that creates a second server
  // where Fastify never processes requests, causing all HTTP calls to hang.
  const httpServer = app.server;

  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — verify JWT on every socket connection
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
      socket.data.phone = payload.phone;

      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId, role } = socket.data;
    console.log(`🔌 Connected: ${role} ${userId}`);

    // Join role-specific room
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    socket.emit(SOCKET_EVENTS.CONNECTED, {
      message: "Connected to At Facility",
    });

    // ── DRIVER EVENTS ──────────────────────────────────────

    // Driver goes online
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
        socket.join(`drivers:online`);
        console.log(`✅ Driver online: ${userId}`);
      } catch (err) {
        console.error("Driver online error:", err);
      }
    });

    // Driver goes offline
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

    // Driver location update — every 4 seconds
    socket.on(
      SOCKET_EVENTS.DRIVER_LOCATION,
      async (data: { lat: number; lng: number; heading?: number }) => {
        if (role !== Role.DRIVER) return;
        try {
          const driver = await prisma.driverProfile.findUnique({
            where: { userId },
          });
          if (!driver) return;

          // Cache in Redis — fast reads for dispatch
          await LocationRedis.set(driver.id, data.lat, data.lng);

          // Update DB every 30s only — not every 4s
          const lastUpdate = driver.lastLocationAt;
          const now = new Date();
          const secondsSinceUpdate = lastUpdate
            ? (now.getTime() - lastUpdate.getTime()) / 1000
            : 999;

          if (secondsSinceUpdate > 30) {
            await prisma.driverProfile.update({
              where: { id: driver.id },
              data: {
                currentLat: data.lat,
                currentLng: data.lng,
                lastLocationAt: now,
              },
            });
          }

          // If driver is on an active ride — push location to customer
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
          console.error("Location update error:", err);
        }
      },
    );

    // Driver accepts ride
    socket.on(SOCKET_EVENTS.DRIVER_ACCEPT, async (data: { rideId: string }) => {
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
          include: { customer: true },
        });

        await prisma.driverProfile.update({
          where: { id: driver.id },
          data: { isAvailable: false },
        });

        // Notify customer
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

        console.log(`✅ Ride ${data.rideId} accepted by driver ${userId}`);
      } catch (err) {
        console.error("Accept ride error:", err);
      }
    });

    // Driver declines ride
    socket.on(
      SOCKET_EVENTS.DRIVER_DECLINE,
      async (data: { rideId: string }) => {
        if (role !== Role.DRIVER) return;
        // Find next nearest driver and dispatch — for now just log
        console.log(`❌ Ride ${data.rideId} declined by driver ${userId}`);
      },
    );

    // Driver arrived at pickup
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
            {
              rideId: ride.id,
            },
          );
        } catch (err) {
          console.error("Arrived error:", err);
        }
      },
    );

    // Driver started ride
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
          io.to(`user:${updated.customerId}`).emit(SOCKET_EVENTS.RIDE_STARTED, {
            rideId: updated.id,
          });
        } catch (err) {
          console.error("Start ride error:", err);
        }
      },
    );

    // Driver completed ride
    socket.on(
      SOCKET_EVENTS.DRIVER_COMPLETED,
      async (data: { rideId: string }) => {
        if (role !== Role.DRIVER) return;
        try {
          const driver = await prisma.driverProfile.findUnique({
            where: { userId },
          });
          if (!driver) return;

          const ride = await prisma.ride.findUnique({
            where: { id: data.rideId },
          });
          if (!ride) return;

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

          // Notify admin
          io.to("role:ADMIN").emit(SOCKET_EVENTS.ADMIN_STATS, {
            event: "ride_completed",
            fare: ride.totalFare,
          });

          console.log(`✅ Ride ${data.rideId} completed`);
        } catch (err) {
          console.error("Complete ride error:", err);
        }
      },
    );

    // ── DISCONNECT ─────────────────────────────────────────
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

  return httpServer;
};

// // Helper — push ride request to a specific driver
// export const sendRideRequest = (driverUserId: string, rideData: object) => {
//   io.to(`user:${driverUserId}`).emit(SOCKET_EVENTS.RIDE_REQUEST, rideData);
// };
