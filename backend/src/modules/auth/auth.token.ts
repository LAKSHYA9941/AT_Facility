import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../../shared/db/prisma";
import { JWTPayload } from "../../shared/types";
import { Role } from "../../shared/types/enums";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "30d";

export const signAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);
};

export const signRefreshToken = (): string => {
  return uuidv4(); // refresh token is just a UUID stored in DB
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
};

export const createTokenPair = async (
  userId: string,
  role: Role,
  phone: string,
  deviceId: string,
  deviceName?: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccessToken({ userId, role, phone });
  const refreshToken = signRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  // revoke existing token for this device first
  await prisma.refreshToken.updateMany({
    where: { userId, deviceId, revoked: false },
    data: { revoked: true },
  });

  // store new refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      deviceId,
      deviceName: deviceName || "Unknown device",
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  return { accessToken, refreshToken };
};

export const rotateRefreshToken = async (
  oldRefreshToken: string,
  deviceId: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: Role;
  phone: string;
}> => {
  // find the token
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });

  if (!stored) throw new Error("Refresh token not found");
  if (stored.revoked) throw new Error("Refresh token revoked");
  if (stored.deviceId !== deviceId) throw new Error("Device mismatch");
  if (new Date() > stored.expiresAt) throw new Error("Refresh token expired");

  // revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  // issue new pair
  const { accessToken, refreshToken } = await createTokenPair(
    stored.userId,
    stored.user.role as Role,
    stored.user.phone,
    deviceId,
    stored.deviceName || undefined,
  );

  return {
    accessToken,
    refreshToken,
    userId: stored.userId,
    role: stored.user.role as Role,
    phone: stored.user.phone,
  };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
};
