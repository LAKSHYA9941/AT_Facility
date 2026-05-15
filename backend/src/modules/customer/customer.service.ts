import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../../shared/db/prisma";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const customerService = {
  uploadIdProof: async (
    userId: string,
    idProofType: string,
    side: "front" | "back" | "single",
  ) => {
    const bucket = process.env.AWS_BUCKET_NAME;
    if (!bucket) throw new Error("AWS_BUCKET_NAME not configured");

    const timestamp = Date.now();
    const fileKey = `customer-ids/${userId}/${idProofType}/${side}-${timestamp}.jpg`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: "image/jpeg",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return { uploadUrl, fileKey };
  },

  confirmIdProof: async (
    userId: string,
    idProofType: string,
    frontKey: string,
    backKey?: string,
  ) => {
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || "ap-south-1";

    const frontUrl = `https://${bucket}.s3.${region}.amazonaws.com/${frontKey}`;
    const backUrl = backKey
      ? `https://${bucket}.s3.${region}.amazonaws.com/${backKey}`
      : null;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        idProofType,
        idProofFront: frontUrl,
        idProofBack: backUrl,
        idSubmittedAt: new Date(),
        idVerified: false,
      },
    });

    return {
      idProofType: user.idProofType,
      idProofFront: user.idProofFront,
      idProofBack: user.idProofBack,
      idVerified: user.idVerified,
      idSubmittedAt: user.idSubmittedAt,
    };
  },

  getIdProofStatus: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        idProofType: true,
        idProofFront: true,
        idProofBack: true,
        idVerified: true,
        idSubmittedAt: true,
      },
    });

    if (!user) throw new Error("User not found");

    return user;
  },
};
