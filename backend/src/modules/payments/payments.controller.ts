import { FastifyRequest, FastifyReply } from "fastify";
import { PaymentsService } from "./payments.service";
import crypto from "crypto";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../shared/utils/response";

const paymentsService = new PaymentsService();

interface CreateOrderBody {
  amount?: number;
  currency?: string;
  receipt?: string;
  notes?: any;
  tripId?: string;
}

interface VerifySignatureBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tripId?: string;
}

export class PaymentsController {
  createOrder = async (
    req: FastifyRequest<{ Body: CreateOrderBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { amount, currency = "INR", receipt, notes, tripId } = req.body;
      const user = (req as any).user;

      if (tripId) {
        const data = await paymentsService.createTripOrder(tripId, user.userId);
        return sendCreated(reply, data, "Order created successfully");
      }

      if (!amount || !receipt)
        return sendError(reply, "Amount and receipt are required");

      const data = await paymentsService.createOrder(
        amount,
        currency,
        receipt,
        notes,
      );
      return sendCreated(reply, data, "Order created successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  verifySignature = async (
    req: FastifyRequest<{ Body: VerifySignatureBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        tripId,
      } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendError(reply, "Missing required payment verification fields");
      }

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
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  bypassVerify = async (
    req: FastifyRequest<{ Body: { tripId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { tripId } = req.body;
      const user = (req as any).user;
      if (!tripId) return sendError(reply, "tripId is required");

      await paymentsService.bypassTripSignature(tripId, user.userId);
      return sendSuccess(
        reply,
        { success: true, tripId },
        "Payment bypassed and verified successfully",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  bypassBalance = async (
    req: FastifyRequest<{ Body: { tripId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { tripId } = req.body;
      const user = (req as any).user;
      if (!tripId) return sendError(reply, "tripId is required");

      await paymentsService.bypassTripBalance(tripId, user.userId);
      return sendSuccess(
        reply,
        { success: true, tripId },
        "Balance payment bypassed successfully",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  handleWebhook = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) throw new Error("Webhook secret not configured");

      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) return sendError(reply, "Missing signature");

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
      return sendError(reply, err.message);
    }
  };

  // ── Custom Plan payments ──────────────────────────────────────────────────

  createCustomPlanOrder = async (
    req: FastifyRequest<{ Body: { planId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { planId } = req.body;
      const user = (req as any).user;
      if (!planId) return sendError(reply, "planId is required");

      const data = await paymentsService.createCustomPlanOrder(
        planId,
        user.userId,
      );
      return sendCreated(reply, data, "Custom plan order created");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  verifyCustomPlanPayment = async (
    req: FastifyRequest<{
      Body: {
        planId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        req.body;
      if (
        !planId ||
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature
      ) {
        return sendError(reply, "Missing required fields");
      }

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
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  bypassCustomPlanPayment = async (
    req: FastifyRequest<{ Body: { planId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { planId } = req.body;
      const user = (req as any).user;
      if (!planId) return sendError(reply, "planId is required");

      await paymentsService.bypassCustomPlanPayment(planId, user.userId);
      return sendSuccess(
        reply,
        { success: true, planId },
        "Custom plan payment bypassed",
      );
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
