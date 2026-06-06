import prisma from "../../shared/db/prisma";
import { VehicleSegment } from "../../shared/types/enums";

export class DriverService {
  async upsertVehicle(
    userId: string,
    data: {
      make: string;
      model: string;
      color: string;
      year: number;
      plateNumber: string;
      registrationNumber: string;
      segment: VehicleSegment;
      maxCapacity: number;
    },
  ) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: profile.id },
      create: {
        driverId: profile.id,
        ...data,
      },
      update: {
        ...data,
      },
    });

    // Also update segment on driver profile for quick access
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { segment: data.segment },
    });

    return vehicle;
  }
  async getVehicle(userId: string) {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { vehicle: true },
    });

    if (!profile) {
      throw new Error("Driver profile not found");
    }

    return profile.vehicle;
  }
}
