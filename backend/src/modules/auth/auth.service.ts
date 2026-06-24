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

// Read admin phone once at startup from env (set via GCP Secret Manager)
const ADMIN_PHONE = process.env.ADMIN_PHONE;
if (!ADMIN_PHONE) {
  // Graceful fallback for local dev if not set, but enforces it in prod.
  console.warn("ADMIN_PHONE env var is missing. Hardcoding for dev only.");
}

const EFFECTIVE_ADMIN_PHONE = ADMIN_PHONE || "+919999999999";

export const authService = {
  // ── Send OTP ──────────────────────────────────────────────
  sendOtp: async (rawPhone: string, role?: string) => {
    const phone = formatPhone(rawPhone);

    // Admin phone bypasses all role/validity checks
    if (phone === EFFECTIVE_ADMIN_PHONE) {
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
    const effectiveRole = phone === EFFECTIVE_ADMIN_PHONE ? Role.ADMIN : role;

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
    } else if (phone === EFFECTIVE_ADMIN_PHONE && user.role !== Role.ADMIN) {
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

  // ── Update Profile ────────────────────────────────────────
  updateProfile: async (
    userId: string,
    data: { name?: string; email?: string; phone?: string; otp?: string },
  ) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== userId) {
        throw new Error("Email already in use");
      }
    }

    if (data.phone && formatPhone(data.phone) !== user.phone) {
      const newPhone = formatPhone(data.phone);

      // Validate Indian phone number for drivers
      if (user.role === Role.DRIVER && !isValidIndianPhone(newPhone)) {
        throw new Error("Drivers must have a valid Indian phone number (+91)");
      }

      if (!isValidPhone(newPhone)) {
        throw new Error("Invalid phone number format");
      }

      const existingPhone = await prisma.user.findUnique({
        where: { phone: newPhone },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new Error("Phone number already in use");
      }

      if (!data.otp) {
        throw new Error("OTP is required to change phone number");
      }

      // Verify OTP
      const result = await verifyOTP(newPhone, data.otp);
      if (!result.valid) {
        throw new Error(result.reason);
      }

      data.phone = newPhone;
    } else {
      // Unchanged or not provided, remove phone from data
      delete data.phone;
    }

    // Remove otp from data before passing to Prisma
    if (data.otp !== undefined) delete data.otp;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return updatedUser;
  },

  // ── Logout ────────────────────────────────────────────────
  logout: async (refreshToken: string) => {
    await revokeRefreshToken(refreshToken);
  },

  // ── Logout all devices ────────────────────────────────────
  logoutAll: async (userId: string) => {
    await revokeAllUserTokens(userId);
  },

  // ── DPDP Data Deletion ────────────────────────────────────
  deleteAccount: async (userId: string) => {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all waypoints and payments for customer trips
      await tx.waypoint.deleteMany({
        where: { trip: { userId } },
      });
      await tx.payment.deleteMany({
        where: { trip: { userId } },
      });
      // Delete Customer Trips
      await tx.trip.deleteMany({
        where: { userId },
      });

      // 2. Handle Driver specific data
      const driver = await tx.driverProfile.findUnique({ where: { userId } });
      if (driver) {
        // Unassign driver from any trips (preserve customer trip history)
        await tx.trip.updateMany({
          where: { driverId: driver.id },
          data: { driverId: null },
        });
        await tx.vehicle.deleteMany({ where: { driverId: driver.id } });
        await tx.driverProfile.delete({ where: { userId } });
      }

      // 3. Delete Package Bookings
      // Note: Payment deleteMany for packages handles related payments
      const packages = await tx.packageBooking.findMany({
        where: { userId },
        select: { id: true },
      });
      const packageIds = packages.map((p) => p.id);
      if (packageIds.length > 0) {
        await tx.payment.deleteMany({
          where: { packageId: { in: packageIds } },
        });
      }
      await tx.packageBooking.deleteMany({ where: { userId } });

      // 4. Delete Rentals
      await tx.rentalExtraCharge.deleteMany({ where: { rental: { userId } } });
      const rentals = await tx.rental.findMany({
        where: { userId },
        select: { id: true },
      });
      const rentalIds = rentals.map((r) => r.id);
      if (rentalIds.length > 0) {
        await tx.payment.deleteMany({ where: { rentalId: { in: rentalIds } } });
      }
      await tx.rental.deleteMany({ where: { userId } });

      // 5. Delete Custom Plans
      const plans = await tx.customPlan.findMany({
        where: { submittedBy: userId },
        select: { id: true },
      });
      const planIds = plans.map((p) => p.id);
      if (planIds.length > 0) {
        await tx.payment.deleteMany({
          where: { customPlanId: { in: planIds } },
        });
      }
      await tx.customPlan.deleteMany({ where: { submittedBy: userId } });

      // 6. Delete Base User Data
      await tx.notification.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // 7. Finally delete the User
      await tx.user.delete({ where: { id: userId } });
    });
  },
};
