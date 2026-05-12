import { prisma } from "../../shared/db/prisma";
import { BookingStatus } from "../../shared/types/enums";

export class RentalsService {
  async getAvailableVehicles() {
    return prisma.vehicle.findMany({
      where: { isAvailableForRental: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createRental(
    userId: string,
    vehicleId: string,
    startDateStr: string,
    endDateStr: string,
    pickupLocation: string,
    returnLocation: string,
    withDriver: boolean,
  ) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle || !vehicle.isAvailableForRental) {
      throw new Error("Vehicle not available for rental");
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const pricePerDay = vehicle.rentalPricePerDay || 0;
    const baseTotalPrice = pricePerDay * totalDays;

    let driverCharge = 0;
    let driverTotalCharge = 0;

    if (withDriver) {
      driverCharge = 500;
      driverTotalCharge = driverCharge * totalDays;
    }

    const prepaidAmount = baseTotalPrice + driverTotalCharge;

    return prisma.rental.create({
      data: {
        userId,
        vehicleId,
        pickupLocation,
        returnLocation,
        startDate,
        endDate,
        totalDays,
        pricePerDay,
        baseTotalPrice,
        withDriver,
        driverCharge,
        driverTotalCharge,
        prepaidAmount,
        status: BookingStatus.PENDING,
      },
    });
  }

  async getMyRentals(userId: string) {
    return prisma.rental.findMany({
      where: { userId },
      include: { vehicle: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async cancelRental(userId: string, rentalId: string) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
    });

    if (!rental || rental.userId !== userId) {
      throw new Error("Rental not found");
    }

    if (rental.status !== BookingStatus.PENDING) {
      throw new Error("Only pending rentals can be cancelled");
    }

    return prisma.rental.update({
      where: { id: rentalId },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
