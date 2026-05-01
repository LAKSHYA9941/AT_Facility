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

export const authService = {
  // ── Send OTP ──────────────────────────────────────────────
  sendOtp: async (rawPhone: string, role?: string) => {
    const phone = formatPhone(rawPhone);

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
          role,
          status: "ACTIVE",
          profileComplete: false,
        },
      });

      // create driver profile if driver
      if (role === Role.DRIVER) {
        await prisma.driverProfile.create({
          data: { userId: user.id },
        });
      }
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
        role: user.role,
        profileComplete: user.profileComplete,
        status: user.status,
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

  // ── Admin login ───────────────────────────────────────────
  adminLogin: async (
    email: string,
    password: string,
    deviceId: string,
    deviceName: string,
  ) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.role !== Role.ADMIN) {
      throw new Error("Invalid credentials");
    }

    if (user.status === "BANNED") {
      throw new Error("Account suspended");
    }

    // admin password stored as bcrypt hash in DB
    const passwordField = (user as any).password;
    if (!passwordField) {
      throw new Error("Admin account not properly configured");
    }

    const valid = await bcrypt.compare(password, passwordField);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const { accessToken, refreshToken } = await createTokenPair(
      user.id,
      Role.ADMIN,
      user.phone || email,
      deviceId,
      deviceName,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },
};
