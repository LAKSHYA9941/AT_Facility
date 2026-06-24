// backend/src/modules/custom-plans/custom-plans.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createCustomPlan,
  fetchCustomPlans,
  fetchCustomPlanById,
  patchCustomPlan,
  fetchMyCustomPlans,
  assignDriverToCustomPlan as assignDriverService,
  fetchAssignedCustomPlans,
} from "./custom-plans.service";
import {
  sendSuccess,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";
import { VehicleSegment } from "@prisma/client";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const submitSchema = z.object({
  pickupLocation: z.string().min(2).max(200),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  destinations: z.array(z.string().min(1)).min(1).max(10),
  numberOfTravellers: z.number().int().min(1).max(50),
  budgetMin: z.number().int().min(500),
  budgetMax: z.number().int().min(500),
  carType: z.nativeEnum(VehicleSegment).optional(),
  hotelRequired: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? false),
  hotelType: z
    .enum(["BUDGET", "STANDARD", "COMFORT_SUITE", "DELUXE", "LUXURY"])
    .nullable()
    .optional(),
  additionalNotes: z.string().max(500).optional(),
});

const listQuerySchema = z.object({
  status: z
    .enum(["NEW", "REVIEWED", "QUOTED", "ACCEPTED", "REJECTED"])
    .optional(),
  role: z.enum(["CUSTOMER", "DRIVER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const updateSchema = z.object({
  status: z
    .enum(["NEW", "REVIEWED", "QUOTED", "ACCEPTED", "REJECTED"])
    .optional(),
  adminNotes: z.string().max(1000).optional(),
  quotedAmount: z.number().int().min(0).optional(),
});

const assignDriverSchema = z.object({
  driverProfileId: z.string().min(1),
  platformCommission: z.number().int().min(0),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function submitCustomPlan(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const body = submitSchema.parse(req.body);
    const { userId, role } = req.user as { userId: string; role: string };
    const plan = await createCustomPlan(userId, role as any, body);
    return sendSuccess(reply, plan, "Custom plan submitted successfully", 201);
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function listCustomPlans(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await fetchCustomPlans(query);
    return sendSuccess(reply, result, "Custom plans fetched");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function getCustomPlanById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const plan = await fetchCustomPlanById(req.params.id);
    if (!plan) return sendNotFound(reply, "Custom plan not found");
    return sendSuccess(reply, plan, "Custom plan fetched");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function updateCustomPlan(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { userId } = req.user as { userId: string };
    const body = updateSchema.parse(req.body);
    const plan = await patchCustomPlan(req.params.id, userId, body);
    return sendSuccess(reply, plan, "Custom plan updated");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function myCustomPlans(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = req.user as { userId: string };
    const plans = await fetchMyCustomPlans(userId);
    return sendSuccess(reply, plans, "My custom plans fetched");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function getAssignedToMe(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId } = req.user as { userId: string };
    const { default: prisma } = await import("../../shared/db/prisma");
    const profile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return sendSuccess(reply, [], "No driver profile found");
    const plans = await fetchAssignedCustomPlans(profile.id);
    return sendSuccess(reply, plans, "Assigned custom plans fetched");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}

export async function assignDriver(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { userId } = req.user as { userId: string };
    const body = assignDriverSchema.parse(req.body);
    const plan = await assignDriverService(
      req.params.id,
      userId,
      body.driverProfileId,
      body.platformCommission,
    );
    return sendSuccess(reply, plan, "Driver assigned to custom plan");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}
