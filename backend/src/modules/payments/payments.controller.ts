import { FastifyRequest, FastifyReply } from "fastify";
import { PaymentsService } from "./payments.service";
import crypto from "crypto";
import { z } from "zod";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../shared/utils/response";
import { AppError } from "../../shared/utils/errors";

const paymentsService = new PaymentsService();

const createOrderSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default("INR"),
  receipt: z.string().optional(),
  notes: z.any().optional(),
  tripId: z.string().uuid().optional(),
});

const verifySignatureSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  tripId: z.string().uuid().optional(),
});

const createBalanceOrderSchema = z.object({
  tripId: z.string().uuid(),
});

const verifyBalanceSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  tripId: z.string().uuid(),
});

const createCustomPlanOrderSchema = z.object({
  planId: z.string().uuid(),
});

const verifyCustomPlanSchema = z.object({
  planId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export class PaymentsController {
  createOrder = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const { amount, currency, receipt, notes, tripId } =
      createOrderSchema.parse(req.body);
    const user = (req as any).user;

    if (tripId) {
      const data = await paymentsService.createTripOrder(tripId, user.userId);
      return sendCreated(reply, data, "Order created successfully");
    }

    if (!amount || !receipt) {
      throw new AppError("Amount and receipt are required", 400);
    }

    const data = await paymentsService.createOrder(
      amount,
      currency,
      receipt,
      notes,
    );
    return sendCreated(reply, data, "Order created successfully");
  };

  verifySignature = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tripId,
    } = verifySignatureSchema.parse(req.body);

    if (tripId) {
      await paymentsService.verifyTripSignature(
        tripId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );
      return sendSuccess(
        reply,
        { success: true, tripId },
        "Payment verified successfully",
      );
    }

    await paymentsService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    return sendSuccess(reply, null, "Payment verified successfully");
  };

  bypassVerify = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const { tripId } = req.body as { tripId: string };
    const user = (req as any).user;

    await paymentsService.bypassVerify(tripId, user.userId);
    return sendSuccess(reply, { success: true }, "Bypass payment verified");
  };

  createBalanceOrderHandler = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const { tripId } = createBalanceOrderSchema.parse(req.body);
    const user = (req as any).user;

    const result = await paymentsService.createBalanceOrder(
      tripId,
      user.userId,
    );
    return sendSuccess(reply, result, "Balance order created", 201);
  };

  verifyBalanceSignatureHandler = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const body = verifyBalanceSchema.parse(req.body);
    const user = (req as any).user;

    const result = await paymentsService.verifyBalanceSignature({
      ...body,
      userId: user.userId,
    });
    return sendSuccess(reply, result, "Balance payment verified");
  };

  handleWebhook = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) throw new AppError("Webhook secret not configured", 500);

      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) {
        return sendError(reply, "Missing signature", 400);
      }

      const bodyString = JSON.stringify(req.body);
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(bodyString)
        .digest("hex");

      if (generatedSignature !== signature) {
        return sendError(reply, "Invalid webhook signature", 400);
      }

      const payload = req.body as any;
      await paymentsService.handleWebhook(payload.event, payload.payload);
      return sendSuccess(reply, { status: "ok" }, "Webhook processed");
    } catch (err: any) {
      console.error("Webhook Error:", err.message);
      // Return 200 to prevent Razorpay retries
      return sendSuccess(
        reply,
        { status: "failed", error: err.message },
        "Webhook processed with error",
      );
    }
  };

  createCustomPlanOrder = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const { planId } = createCustomPlanOrderSchema.parse(req.body);
    const user = (req as any).user;

    const data = await paymentsService.createCustomPlanOrder(
      planId,
      user.userId,
    );
    return sendCreated(reply, data, "Custom plan order created");
  };

  verifyCustomPlanPayment = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      verifyCustomPlanSchema.parse(req.body);

    await paymentsService.verifyCustomPlanPayment(
      planId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    return sendSuccess(
      reply,
      { success: true, planId },
      "Custom plan payment verified",
    );
  };
}
