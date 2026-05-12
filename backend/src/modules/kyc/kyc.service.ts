import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../shared/db/prisma";
import {
  DocumentType,
  DocumentStatus,
  KYCStatus,
} from "../../shared/types/enums";

const s3Client = new S3Client({
  region: "us-east-1",
});

export class KycService {
  private async getDriverProfileId(userId: string): Promise<string> {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new Error("Driver profile not found");
    }
    return profile.id;
  }

  async generateUploadUrl(userId: string, docType: DocumentType) {
    const driverId = await this.getDriverProfileId(userId);
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("AWS_BUCKET_NAME is not configured");
    }

    const fileKey = `kyc/${driverId}/${docType}-${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: "image/jpeg",
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;

    const document = await prisma.document.upsert({
      where: {
        driverId_type: {
          driverId,
          type: docType,
        },
      },
      update: {
        fileUrl,
        status: DocumentStatus.PENDING,
        rejectReason: null,
      },
      create: {
        driverId,
        type: docType,
        fileUrl,
        status: DocumentStatus.PENDING,
      },
    });

    return {
      presignedUrl,
      document,
    };
  }

  async submitKyc(userId: string) {
    const driverId = await this.getDriverProfileId(userId);
    const docs = await prisma.document.findMany({
      where: { driverId },
    });

    const requiredDocs: DocumentType[] = [
      DocumentType.AADHAAR,
      DocumentType.DRIVING_LICENSE,
      DocumentType.VEHICLE_RC,
      DocumentType.PAN,
      DocumentType.BANK_DETAILS,
      DocumentType.SELFIE,
    ];

    const uploadedTypes = docs.map((d) => d.type);
    const missingDocs = requiredDocs.filter(
      (type) => !uploadedTypes.includes(type),
    );

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.join(", ")}`);
    }

    const driverProfile = await prisma.driverProfile.update({
      where: { userId },
      data: { kycStatus: KYCStatus.PENDING },
    });

    return driverProfile;
  }

  async getKycStatus(userId: string) {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        documents: true,
      },
    });

    if (!driverProfile) {
      throw new Error("Driver profile not found");
    }

    return {
      kycStatus: driverProfile.kycStatus,
      documents: driverProfile.documents,
    };
  }
}
