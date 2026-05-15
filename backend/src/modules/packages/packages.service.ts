import prisma from "../../shared/db/prisma";
import { PackageCategory, BookingStatus } from "../../shared/types/enums";

export class PackagesService {
  async listPackages(category?: PackageCategory) {
    return prisma.package.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPackage(id: string) {
    const pkg = await prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new Error("Package not found");
    return pkg;
  }

  async bookPackage(
    userId: string,
    packageId: string,
    travelDate: string,
    numPeople: number,
  ) {
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      throw new Error("Package not available");
    }

    const pricePerPerson = pkg.price;
    const totalPrice = pricePerPerson * numPeople;

    return prisma.packageBooking.create({
      data: {
        userId,
        packageId,
        travelDate: new Date(travelDate),
        numPeople,
        pricePerPerson,
        totalPrice,
        status: BookingStatus.PENDING,
      },
    });
  }

  async getMyBookings(userId: string) {
    return prisma.packageBooking.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async cancelBooking(userId: string, bookingId: string) {
    const booking = await prisma.packageBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.userId !== userId) {
      throw new Error("Booking not found");
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error("Only pending bookings can be cancelled");
    }

    return prisma.packageBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
