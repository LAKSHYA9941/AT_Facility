// backend/src/modules/custom-plans/custom-plans.service.ts
import prisma from "../../shared/db/prisma";
import { Role, VehicleSegment, CustomPlanStatus } from "@prisma/client";
import { logger } from "../../shared/logger/logger";

type CreateCustomPlanInput = {
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  destinations: string[];
  numberOfTravellers: number;
  budgetMin: number;
  budgetMax: number;
  carType?: VehicleSegment;
  hotelRequired: boolean;
  hotelType?: string | null;
  additionalNotes?: string;
};

// ── Create ─────────────────────────────────────────────────────────────────

export async function createCustomPlan(
  userId: string,
  role: Role,
  data: CreateCustomPlanInput,
) {
  // Only CUSTOMER and DRIVER can submit plans
  if (role !== Role.CUSTOMER && role !== Role.DRIVER) {
    throw new Error("Only customers and drivers can submit custom plans");
  }

  const plan = await prisma.customPlan.create({
    data: {
      submittedBy: userId,
      submittedByRole: role,
      ...data,
    },
    include: {
      user: { select: { name: true, phone: true, role: true } },
    },
  });

  return plan;
}

// ── List (admin) ────────────────────────────────────────────────────────────

export async function fetchCustomPlans(filters: {
  status?: CustomPlanStatus;
  role?: Role;
  page: number;
  limit: number;
}) {
  const { status, role, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(role ? { submittedByRole: role } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phone: true, role: true } },
        assignedDriver: {
          include: {
            user: { select: { name: true, phone: true } },
            vehicle: {
              select: {
                make: true,
                model: true,
                segment: true,
                plateNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.customPlan.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  };
}

// ── Single (admin) ──────────────────────────────────────────────────────────

export async function fetchCustomPlanById(id: string) {
  return prisma.customPlan.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, phone: true, email: true, role: true } },
      assignedDriver: {
        include: {
          user: { select: { name: true, phone: true } },
          vehicle: {
            select: {
              make: true,
              model: true,
              segment: true,
              plateNumber: true,
            },
          },
        },
      },
    },
  });
}

// ── Update (admin) ──────────────────────────────────────────────────────────

export async function patchCustomPlan(
  id: string,
  adminId: string,
  data: {
    status?: CustomPlanStatus;
    adminNotes?: string;
    quotedAmount?: number;
  },
) {
  const updated = await prisma.customPlan.update({
    where: { id },
    data: {
      ...data,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
    include: {
      user: { select: { name: true, phone: true } },
      assignedDriver: {
        include: {
          user: { select: { name: true, phone: true } },
          vehicle: {
            select: {
              make: true,
              model: true,
              segment: true,
              plateNumber: true,
            },
          },
        },
      },
    },
  });

  return updated;
}

// ── My plans (customer / driver) ────────────────────────────────────────────

export async function fetchMyCustomPlans(userId: string) {
  return prisma.customPlan.findMany({
    where: { submittedBy: userId },
    orderBy: { createdAt: "desc" },
    include: {
      payment: { select: { status: true } },
    },
  });
}

// ── Assign driver (admin) ───────────────────────────────────────────────────

export async function assignDriverToCustomPlan(
  planId: string,
  adminId: string,
  driverProfileId: string,
  platformCommission: number,
) {
  const plan = await prisma.customPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Custom plan not found");
  if (plan.status !== "ACCEPTED")
    throw new Error("Plan must be ACCEPTED before assigning a driver");
  if (!plan.quotedAmount) throw new Error("Plan has no quoted amount");
  if (platformCommission < 0 || platformCommission > plan.quotedAmount) {
    throw new Error("Invalid commission amount");
  }

  // Verify driver exists and is available
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { user: { select: { name: true, phone: true } }, vehicle: true },
  });
  if (!driver) throw new Error("Driver not found");
  if (driver.kycStatus !== "VERIFIED")
    throw new Error("Driver KYC not verified");

  const driverEarning = plan.quotedAmount - platformCommission;

  const updated = await prisma.customPlan.update({
    where: { id: planId },
    data: {
      assignedDriverId: driverProfileId,
      platformCommission,
      driverEarning,
    },
    include: {
      user: { select: { name: true, phone: true } },
      assignedDriver: {
        include: {
          user: { select: { name: true, phone: true } },
          vehicle: {
            select: {
              make: true,
              model: true,
              segment: true,
              plateNumber: true,
            },
          },
        },
      },
    },
  });

  return updated;
}

// ── Plans assigned to a driver by admin ─────────────────────────────────────

export async function fetchAssignedCustomPlans(driverProfileId: string) {
  const plans = await prisma.customPlan.findMany({
    where: {
      assignedDriverId: driverProfileId,
      status: "ACCEPTED",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      pickupLocation: true,
      destinations: true,
      numberOfTravellers: true,
      carType: true,
      hotelRequired: true,
      hotelType: true,
      additionalNotes: true,
      driverEarning: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, phone: true } },
    },
  });
  return plans;
}
