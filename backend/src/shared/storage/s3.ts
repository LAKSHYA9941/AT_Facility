import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = () => {
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket) throw new Error("AWS_BUCKET_NAME is not configured");
  return bucket;
};

/**
 * Extract the S3 key from a full S3 URL.
 * e.g. "https://atfacility-docs.s3.amazonaws.com/kyc/abc/AADHAAR-123.jpg"
 *    → "kyc/abc/AADHAAR-123.jpg"
 */
export function extractS3Key(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    // Remove leading slash
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    // If not a valid URL, assume it's already a key
    return fileUrl;
  }
}

/**
 * Generate a presigned GET URL for viewing a file in S3.
 * @param fileUrl - The full S3 URL or key
 * @param expiresIn - TTL in seconds (default 5 minutes)
 */
export async function getPresignedViewUrl(
  fileUrl: string,
  expiresIn = 300,
): Promise<string> {
  const key = extractS3Key(fileUrl);
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 * @param key - The S3 key (path)
 * @param contentType - MIME type
 * @param expiresIn - TTL in seconds (default 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType = "image/jpeg",
  expiresIn = 3600,
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const bucket = BUCKET();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
  return { uploadUrl, fileUrl };
}
