-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DRIVER_ENROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL_REFUND';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VehicleSegment" ADD VALUE 'TEMPO';
ALTER TYPE "VehicleSegment" ADD VALUE 'BUS';

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "strikes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "isRoundTrip" BOOLEAN NOT NULL DEFAULT false,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "suggestedSegment" "VehicleSegment" NOT NULL,
    "actualSegment" "VehicleSegment" NOT NULL,
    "extraPassengers" INTEGER NOT NULL DEFAULT 0,
    "extraHeadCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forceUpgraded" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perKmRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "driverAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundTripDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TripStatus" NOT NULL DEFAULT 'OPEN',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundStatus" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripWaypoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "estimatedArrival" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripEarning" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "gross" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "allowance" DOUBLE PRECISION NOT NULL,
    "net" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRating" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "ratingById" TEXT NOT NULL,
    "ratingForId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_customerId_idx" ON "Trip"("customerId");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");

-- CreateIndex
CREATE INDEX "TripWaypoint_tripId_idx" ON "TripWaypoint"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripEarning_tripId_key" ON "TripEarning"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripRating_tripId_ratingById_key" ON "TripRating"("tripId", "ratingById");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripWaypoint" ADD CONSTRAINT "TripWaypoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEarning" ADD CONSTRAINT "TripEarning_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEarning" ADD CONSTRAINT "TripEarning_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRating" ADD CONSTRAINT "TripRating_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRating" ADD CONSTRAINT "TripRating_ratingById_fkey" FOREIGN KEY ("ratingById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRating" ADD CONSTRAINT "TripRating_ratingForId_fkey" FOREIGN KEY ("ratingForId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
