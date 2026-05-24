import bcrypt from "bcryptjs";
import prisma from "../../shared/db/prisma";
import { sendOTP, verifyOTP } from "./auth.otp";
import {
  createTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from "./auth.token";
import {
  formatPhone,
  isValidPhone,
  isValidIndianPhone,
} from "../../shared/utils/phone";
import { Role } from "../../shared/types/enums";

// Hardcoded admin phone — always gets ADMIN role, bypasses KYC
const ADMIN_PHONE = "+919999999999";

export const authService = {
  // ── Send OTP ──────────────────────────────────────────────
  sendOtp: async (rawPhone: string, role?: string) => {
    const phone = formatPhone(rawPhone);

    // Admin phone bypasses all role/validity checks
    if (phone === ADMIN_PHONE) {
      await sendOTP(phone);
      return { phone };
    }

    // drivers must have Indian numbers
    if (role === "DRIVER" && !isValidIndianPhone(phone)) {
      throw new Error("Drivers must have a valid Indian phone number (+91)");
    }

    if (!isValidPhone(phone)) {
      throw new Error("Invalid phone number");
    }

    // check user not banned
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing?.status === "BANNED") {
      throw new Error("This account has been banned. Contact support.");
    }

    await sendOTP(phone);
    return { phone };
  },

  // ── Verify OTP + login/register ───────────────────────────
  verifyOtp: async (
    rawPhone: string,
    otp: string,
    deviceId: string,
    deviceName: string,
    role: Role = Role.CUSTOMER,
  ) => {
    const phone = formatPhone(rawPhone);

    // Admin phone: force ADMIN role regardless of what was requested
    const effectiveRole = phone === ADMIN_PHONE ? Role.ADMIN : role;

    const result = await verifyOTP(phone, otp);

    if (!result.valid) {
      throw new Error(result.reason);
    }

    // find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          phone,
          role: effectiveRole,
          status: "ACTIVE",
          // Admin always gets profileComplete=true so no onboarding screen
          profileComplete: effectiveRole === Role.ADMIN ? true : false,
          name: effectiveRole === Role.ADMIN ? "Admin" : null,
        },
      });

      // create driver profile if driver
      if (effectiveRole === Role.DRIVER) {
        await prisma.driverProfile.create({
          data: { userId: user.id },
        });
      }
    } else if (phone === ADMIN_PHONE && user.role !== Role.ADMIN) {
      // Upgrade existing user to ADMIN if they somehow got created as another role
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: Role.ADMIN,
          profileComplete: true,
          name: user.name ?? "Admin",
        },
      });
    }

    if (user.status === "BANNED") {
      throw new Error("This account has been banned.");
    }

    const { accessToken, refreshToken } = await createTokenPair(
      user.id,
      user.role as Role,
      user.phone,
      deviceId,
      deviceName,
    );

    return {
      accessToken,
      refreshToken,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        profileComplete: user.profileComplete,
        status: user.status,
        idVerified: user.idVerified,
        idSubmittedAt: user.idSubmittedAt,
      },
    };
  },

  // ── Complete profile ──────────────────────────────────────
  completeProfile: async (userId: string, name: string, email?: string) => {
    // check email not taken
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new Error("Email already in use");
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email || undefined,
        profileComplete: true,
      },
    });

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      profileComplete: user.profileComplete,
    };
  },

  // ── Refresh token ─────────────────────────────────────────
  refresh: async (refreshToken: string, deviceId: string) => {
    try {
      const result = await rotateRefreshToken(refreshToken, deviceId);
      return result;
    } catch (err: any) {
      throw new Error(err.message || "Invalid refresh token");
    }
  },

  // ── Logout ────────────────────────────────────────────────
  logout: async (refreshToken: string) => {
    await revokeRefreshToken(refreshToken);
  },

  // ── Logout all devices ────────────────────────────────────
  logoutAll: async (userId: string) => {
    await revokeAllUserTokens(userId);
  },
};
