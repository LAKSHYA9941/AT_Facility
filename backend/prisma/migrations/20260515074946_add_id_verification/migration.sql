-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idProofBack" TEXT,
ADD COLUMN     "idProofFront" TEXT,
ADD COLUMN     "idProofType" TEXT,
ADD COLUMN     "idSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "idVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "idVerifiedBy" TEXT;
