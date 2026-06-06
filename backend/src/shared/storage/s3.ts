// backend/src/shared/storage/s3.ts
// Complete replacement for the currently empty s3.ts file.
// Both KYC and customer document services should import getPresignedGetUrl from here.

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET ?? "atfacility-docs";

// ── Generate presigned PUT URL (for upload) ──────────────────────────────────
// Used by kyc.service.ts and customer.service.ts when client wants to upload a file.

export async function getPresignedPutUrl(
  key: string,
  contentType: string = "image/jpeg",
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // Upload URL valid for 10 minutes
  return getSignedUrl(s3, command, { expiresIn: 600 });
}

// ── Generate presigned GET URL (for viewing) ─────────────────────────────────
// Used by admin document review endpoints. Never expose public S3 URLs.

export async function getPresignedGetUrl(
  key: string,
  expiresInSeconds: number = 600, // 10 minutes — long enough for admin to view
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// ── Extract S3 key from a stored URL ────────────────────────────────────────
// e.g. "https://atfacility-docs.s3.ap-south-1.amazonaws.com/kyc/abc/AADHAAR-123.jpg"
// → "kyc/abc/AADHAAR-123.jpg"

export function extractS3Key(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove leading slash
    return parsed.pathname.replace(/^\//, "");
  } catch {
    // If it's already a key (no http), return as-is
    return url;
  }
}
