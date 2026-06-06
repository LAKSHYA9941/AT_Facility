import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../../shared/db/prisma";
import {
  DocumentType,
  DocumentStatus,
  KYCStatus,
} from "../../shared/types/enums";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
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

  async generateUploadUrl(
    userId: string,
    docType: DocumentType,
    documentNumber?: string,
  ) {
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

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;

    const updateData: any = {};
    if (docType === DocumentType.AADHAAR) {
      updateData.aadhaarUrl = fileUrl;
      if (documentNumber) updateData.aadhaarNumber = documentNumber;
    } else if (docType === DocumentType.DRIVING_LICENSE) {
      updateData.dlUrl = fileUrl;
      if (documentNumber) updateData.dlNumber = documentNumber;
    } else if (docType === DocumentType.VEHICLE_RC) {
      updateData.rcUrl = fileUrl;
      if (documentNumber) updateData.rcNumber = documentNumber;
    } else if (docType === DocumentType.PAN) {
      updateData.panUrl = fileUrl;
      if (documentNumber) updateData.panNumber = documentNumber;
    } else if (docType === DocumentType.BANK_DETAILS) {
      updateData.bankDetailsUrl = fileUrl;
      // We map documentNumber to bankAccountNumber if provided
      if (documentNumber) updateData.bankAccountNumber = documentNumber;
    } else if (docType === DocumentType.SELFIE) {
      updateData.selfieUrl = fileUrl;
    }

    const profile = await prisma.driverProfile.update({
      where: { id: driverId },
      data: updateData,
    });

    return { presignedUrl, fileUrl };
  }

  async submitKyc(
    userId: string,
    data: {
      name?: string;
      bankIFSC?: string;
      bankAccountName?: string;
      aadhaarNumber?: string;
      dlNumber?: string;
      rcNumber?: string;
      panNumber?: string;
    },
  ) {
    const driverId = await this.getDriverProfileId(userId);
    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) throw new Error("Profile not found");

    const missing = [];
    if (!profile.aadhaarUrl) missing.push("AADHAAR");
    if (!profile.dlUrl) missing.push("DRIVING_LICENSE");
    if (!profile.rcUrl) missing.push("VEHICLE_RC");
    if (!profile.panUrl) missing.push("PAN");
    if (!profile.bankDetailsUrl) missing.push("BANK_DETAILS");
    if (!profile.selfieUrl) missing.push("SELFIE");

    if (missing.length > 0) {
      throw new Error(`Missing required documents: ${missing.join(", ")}`);
    }

    if (!data.name) throw new Error("Driver name is required");
    if (!data.bankIFSC) throw new Error("Bank IFSC is required");
    if (!data.bankAccountName) throw new Error("Bank account name is required");

    // Update user name as well
    await prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    return prisma.driverProfile.update({
      where: { userId },
      data: {
        name: data.name,
        bankIFSC: data.bankIFSC,
        bankAccountName: data.bankAccountName,
        aadhaarNumber: data.aadhaarNumber,
        dlNumber: data.dlNumber,
        rcNumber: data.rcNumber,
        panNumber: data.panNumber,
        kycStatus: KYCStatus.PENDING,
      },
    });
  }

  async getKycStatus(userId: string) {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driverProfile) {
      throw new Error("Driver profile not found");
    }

    return driverProfile;
  }
}
