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
  amount: number;
  currency?: string;
  receipt: string;
  notes?: any;
}

interface VerifySignatureBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentsController {
  createOrder = async (
    req: FastifyRequest<{ Body: CreateOrderBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { amount, currency = "INR", receipt, notes } = req.body;
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendError(reply, "Missing required payment verification fields");
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
}
