// backend/src/modules/custom-plans/custom-plans.service.ts
import prisma from "../../shared/db/prisma";
import { Role, VehicleSegment, CustomPlanStatus } from "@prisma/client";
import { io } from "../../shared/socket/socket";
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

  // Notify admin room in real-time via Socket.io
  try {
    io.to("admin:room").emit("admin:custom_plan:new", {
      id: plan.id,
      submittedByRole: plan.submittedByRole,
      submitterName: plan.user.name,
      submitterPhone: plan.user.phone,
      pickupLocation: plan.pickupLocation,
      destinations: plan.destinations,
      numberOfTravellers: plan.numberOfTravellers,
      budgetMin: plan.budgetMin,
      budgetMax: plan.budgetMax,
      carType: plan.carType,
      hotelRequired: plan.hotelRequired,
      createdAt: plan.createdAt,
    });
  } catch (e) {
    // Socket emit failure should never crash the HTTP response
    logger.warn({ err: e }, "Failed to emit admin:custom_plan:new");
  }

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
    },
  });

  // Notify the submitter that their plan was updated
  try {
    io.to(`user:${updated.submittedBy}`).emit("custom_plan:updated", {
      id: updated.id,
      status: updated.status,
      quotedAmount: updated.quotedAmount,
      adminNotes: updated.adminNotes,
    });
  } catch (e) {
    logger.warn({ err: e }, "Failed to emit custom_plan:updated");
  }

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
    },
  });

  // Notify the customer
  try {
    io.to(`user:${updated.submittedBy}`).emit("custom_plan:driver_assigned", {
      id: updated.id,
      driverName: driver.user.name,
      driverPhone: driver.user.phone,
    });
  } catch (e) {
    logger.warn({ err: e }, "Failed to emit custom_plan:driver_assigned");
  }

  return updated;
}
