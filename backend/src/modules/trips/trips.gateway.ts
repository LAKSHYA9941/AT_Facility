import { Server, Socket } from "socket.io";
import { prisma } from "../../shared/db/prisma";
import { LocationRedis } from "../../shared/redis/redis";
import { SOCKET_EVENTS } from "../../shared/socket/socket.events";
import { Role } from "../../shared/types/enums";
import { safeSocketHandler } from "../../shared/socket/socket.handler";
import { logger } from "../../shared/logger/logger";
import { z } from "zod/v4";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
});

const acceptJobSchema = z.object({
  tripId: z.string(),
  driverId: z.string(),
});

export const setupTripsGateway = (io: Server, socket: Socket) => {
  const { userId, role } = socket.data;

  socket.on(
    SOCKET_EVENTS.DRIVER_ONLINE,
    safeSocketHandler(socket, SOCKET_EVENTS.DRIVER_ONLINE, async () => {
      if (role !== Role.DRIVER) return;

      const driver = await prisma.driverProfile.findUnique({
        where: { userId },
      });
      if (!driver || driver.kycStatus !== "VERIFIED") {
        throw new Error("KYC not verified");
      }
      await prisma.driverProfile.update({
        where: { userId },
        data: { isOnline: true, isAvailable: true },
      });
      socket.join("drivers:online");
      logger.info({ userId }, "Driver online");
    }),
  );

  socket.on(
    SOCKET_EVENTS.DRIVER_OFFLINE,
    safeSocketHandler(socket, SOCKET_EVENTS.DRIVER_OFFLINE, async () => {
      if (role !== Role.DRIVER) return;

      await prisma.driverProfile.update({
        where: { userId },
        data: { isOnline: false, isAvailable: false },
      });
      await LocationRedis.delete(userId);
      socket.leave("drivers:online");
      logger.info({ userId }, "Driver offline");
    }),
  );

  socket.on(
    SOCKET_EVENTS.DRIVER_LOCATION,
    safeSocketHandler(
      socket,
      SOCKET_EVENTS.DRIVER_LOCATION,
      async (raw: unknown) => {
        if (role !== Role.DRIVER) return;
        const data = locationSchema.parse(raw);

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

        // Broadcast to admin map for live driver tracking
        io.to("role:ADMIN").emit(SOCKET_EVENTS.ADMIN_DRIVER_LOCATION, {
          driverId: driver.id,
          name: driver.userId, // admin will resolve name from initial fetch
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
        });
      },
    ),
  );

  socket.on(
    SOCKET_EVENTS.DRIVER_ACCEPT_JOB,
    safeSocketHandler(
      socket,
      SOCKET_EVENTS.DRIVER_ACCEPT_JOB,
      async (raw: unknown) => {
        if (role !== Role.DRIVER) return;
        const { tripId, driverId } = acceptJobSchema.parse(raw);

        // 1. Verify driver KYC status
        const driver = await prisma.driverProfile.findUnique({
          where: { id: driverId },
          include: { user: true },
        });
        if (!driver || driver.kycStatus !== "VERIFIED") {
          throw new Error("KYC not approved. You cannot accept jobs.");
        }

        // 2. Atomic check-and-assign
        const tripUpdateRes = await prisma.trip.updateMany({
          where: { id: tripId, status: "CONFIRMED", driverId: null },
          data: { driverId, status: "DRIVER_ASSIGNED" },
        });

        if (tripUpdateRes.count === 0) {
          throw new Error("Job no longer available.");
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
        socket.broadcast.emit("trip:job_taken", { tripId });
      },
    ),
  );

  socket.on(
    "disconnect",
    safeSocketHandler(socket, "disconnect", async () => {
      logger.info({ userId, role }, "Disconnected");
      if (role === Role.DRIVER) {
        await prisma.driverProfile.update({
          where: { userId },
          data: { isOnline: false, isAvailable: false },
        });
        await LocationRedis.delete(userId);
      }
    }),
  );
};
