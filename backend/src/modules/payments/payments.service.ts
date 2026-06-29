import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../../shared/db/prisma";
import { PaymentStatus, PaymentMethod } from "../../shared/types/enums";
import { PaymentType } from "@prisma/client";
import { messagingService } from "../notifications/messaging.service";
import { AppError } from "../../shared/utils/errors";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class PaymentsService {
  async createOrder(
    amount: number,
    currency: string = "INR",
    receipt: string,
    notes: any = {},
  ): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    key: string | undefined;
  }> {
    const options = {
      amount: Math.round(amount * 100), // paise
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);

    // Pre-emptively link order to DB entity if notes are provided
    if (notes?.type === "PACKAGE" && notes?.id) {
      await prisma.packageBooking.update({
        where: { id: notes.id },
        data: { razorpayOrderId: order.id },
      });
    } else if (notes?.type === "RENTAL" && notes?.id) {
      await prisma.rental.update({
        where: { id: notes.id },
        data: { razorpayOrderId: order.id },
      });
    }

    return {
      orderId: order.id,
      amount:
        typeof order.amount === "number"
          ? order.amount
          : parseInt(order.amount, 10),
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new AppError("Invalid payment signature", 400);
    }

    await this.markOrderAsPaid(orderId, paymentId);
    return true;
  }

  async processRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundOptions: any = {};
      if (amount) {
        refundOptions.amount = Math.round(amount * 100);
      }
      const refund = await razorpay.payments.refund(paymentId, refundOptions);
      return refund;
    } catch (err: any) {
      console.error("Razorpay refund error:", err);
      throw new AppError(
        `Refund failed: ${err.message || "Unknown error"}`,
        400,
      );
    }
  }

  async createTripOrder(
    tripId: string,
    userId: string,
  ): Promise<{
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string | undefined;
  }> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError("Trip not found", 404);
    if (trip.status !== "PENDING_PAYMENT")
      throw new AppError("Trip is not pending payment", 400);
    if (trip.userId !== userId) throw new AppError("Unauthorized", 403);

    const amountPaise = Math.round(trip.amountPaidUpfront * 100);
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `trip_${trip.id.replace(/-/g, "").substring(0, 20)}`,
      notes: { tripId, type: "UPFRONT", userId },
    };

    const order = await razorpay.orders.create(options);

    await prisma.payment.upsert({
      where: {
        tripId_type: {
          tripId,
          type: PaymentType.UPFRONT,
        },
      },
      create: {
        tripId,
        type: PaymentType.UPFRONT,
        razorpayOrderId: order.id,
        amount: trip.amountPaidUpfront,
        status: "INITIATED",
      },
      update: {
        razorpayOrderId: order.id,
        amount: trip.amountPaidUpfront,
        status: "INITIATED",
      },
    });

    return {
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyTripSignature(
    tripId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new AppError("Invalid payment signature", 400);
    }

    const currentTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { status: true },
    });
    if (currentTrip?.status !== "PENDING_PAYMENT") {
      return true; // Already handled by webhook or invalid state
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CONFIRMED" },
      include: { waypoints: { orderBy: { orderIndex: "asc" } }, user: true },
    });

    await prisma.payment.update({
      where: {
        tripId_type: {
          tripId,
          type: PaymentType.UPFRONT,
        },
      },
      data: { status: "PAID", razorpayPaymentId: paymentId },
    });

    if (trip.user?.phone && trip.startOtp) {
      messagingService.sendCustomerBookingConfirmed(
        trip.id,
        trip.user.phone,
        trip.startOtp,
      );
    }
    const pickup = trip.waypoints[0]?.address || "Pickup";
    const drop = trip.waypoints[trip.waypoints.length - 1]?.address || "Drop";
    messagingService.sendNewJobAvailable(
      trip.id,
      trip.vehicleSegment,
      pickup,
      drop,
    );

    return true;
  }

  async bypassVerify(tripId: string, userId: string): Promise<void> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError("Trip not found", 404);
    if (trip.userId !== userId) throw new AppError("Unauthorized", 403);
    if (trip.status !== "PENDING_PAYMENT")
      throw new AppError("Trip is not pending payment", 400);

    // Bypass verification logic
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CONFIRMED" },
    });
  }

  // Custom plans do NOT get split payment in Mode B.
  // Custom plans are quote-based — admin sets the total price,
  // customer pays 100% upfront. There is no balance concept.
  // The balance flow is strictly for trips only.
  async createBalanceOrder(
    tripId: string,
    userId: string,
  ): Promise<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
  }> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: { payments: true },
    });

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.status !== "ACTIVE" && trip.status !== "COMPLETED") {
      throw new AppError(
        "Balance payment is only available for active or completed trips",
        400,
      );
    }

    if (trip.balanceRemaining <= 0) {
      throw new AppError("No balance remaining on this trip", 400);
    }

    const existingBalancePayment = trip.payments.find(
      (p) => p.type === PaymentType.BALANCE,
    );

    if (existingBalancePayment) {
      if (existingBalancePayment.status === "PAID") {
        throw new AppError("Balance already paid", 409);
      }
      if (
        existingBalancePayment.status === "PENDING" &&
        existingBalancePayment.razorpayOrderId
      ) {
        return {
          razorpayOrderId: existingBalancePayment.razorpayOrderId,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
          amount: Math.round(trip.balanceRemaining * 100),
          currency: "INR",
        };
      }
    }

    const amountPaise = Math.round(trip.balanceRemaining * 100);
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `balance_${tripId.slice(0, 8)}_${Date.now()}`,
      notes: { tripId, type: "BALANCE", userId },
    };

    const order = await razorpay.orders.create(options);

    await prisma.payment.create({
      data: {
        tripId,
        type: PaymentType.BALANCE,
        razorpayOrderId: order.id,
        amount: trip.balanceRemaining,
        status: "PENDING",
        method: PaymentMethod.UPI,
      },
    });

    return {
      razorpayOrderId: order.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
      amount: amountPaise,
      currency: "INR",
    };
  }

  async verifyBalanceSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    tripId: string;
    userId: string;
  }): Promise<{ success: boolean; tripId: string }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, tripId } =
      params;

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpaySignature) {
      throw new AppError("Invalid payment signature", 400);
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId },
    });

    if (existingPayment) {
      return { success: true, tripId };
    }

    await prisma.$transaction(async (tx) => {
      const balancePayment = await tx.payment.findFirst({
        where: { razorpayOrderId, type: PaymentType.BALANCE },
      });

      if (balancePayment) {
        await tx.payment.update({
          where: { id: balancePayment.id },
          data: { status: "PAID", razorpayPaymentId },
        });
      }

      await tx.trip.update({
        where: { id: tripId },
        data: { balanceRemaining: 0 },
      });
    });

    return { success: true, tripId };
  }

  async handleWebhook(event: string, payload: any): Promise<void> {
    const paymentId = payload?.payment?.entity?.id;
    if (!paymentId) return;

    // Idempotency check
    const existing = await prisma.payment.findFirst({
      where: { razorpayPaymentId: paymentId },
    });
    if (existing) {
      console.log(
        `Duplicate webhook received for payment ${paymentId} — skipping`,
      );
      return;
    }

    if (event === "payment.captured") {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.markOrderAsPaid(orderId, paymentId);
      }
    } else if (event === "payment.failed") {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.markOrderAsFailed(orderId, paymentId);
      }
    }
  }

  private async markOrderAsPaid(
    orderId: string,
    paymentId: string,
  ): Promise<void> {
    const pkg = await prisma.packageBooking.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (pkg) {
      await prisma.packageBooking.update({
        where: { id: pkg.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await prisma.payment.updateMany({
        where: { packageId: pkg.id },
        data: { status: "PAID", razorpayPaymentId: paymentId },
      });
      return;
    }

    const rental = await prisma.rental.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (rental) {
      await prisma.rental.update({
        where: { id: rental.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await prisma.payment.updateMany({
        where: { rentalId: rental.id },
        data: { status: "PAID", razorpayPaymentId: paymentId },
      });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
      include: {
        trip: {
          include: {
            waypoints: { orderBy: { orderIndex: "asc" } },
            user: true,
          },
        },
      },
    });

    if (payment) {
      if (payment.type === PaymentType.UPFRONT) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", razorpayPaymentId: paymentId },
        });

        if (payment.trip && payment.trip.status === "PENDING_PAYMENT") {
          await prisma.trip.update({
            where: { id: payment.trip.id },
            data: { status: "CONFIRMED" },
          });

          if (payment.trip.user?.phone && payment.trip.startOtp) {
            messagingService.sendCustomerBookingConfirmed(
              payment.trip.id,
              payment.trip.user.phone,
              payment.trip.startOtp,
            );
          }
          const pickup = payment.trip.waypoints[0]?.address || "Pickup";
          const drop =
            payment.trip.waypoints[payment.trip.waypoints.length - 1]
              ?.address || "Drop";
          messagingService.sendNewJobAvailable(
            payment.trip.id,
            payment.trip.vehicleSegment,
            pickup,
            drop,
          );
        }
      } else if (payment.type === PaymentType.BALANCE) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", razorpayPaymentId: paymentId },
        });

        if (payment.trip) {
          await prisma.trip.update({
            where: { id: payment.trip.id },
            data: { balanceRemaining: 0 },
          });
        }
      }
      return;
    }

    console.warn(
      `Webhook received for order ${orderId} but no DB record found.`,
    );
  }

  private async markOrderAsFailed(
    orderId: string,
    paymentId?: string,
  ): Promise<void> {
    const pkg = await prisma.packageBooking.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (pkg) {
      await prisma.packageBooking.update({
        where: { id: pkg.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      await prisma.payment.updateMany({
        where: { packageId: pkg.id },
        data: { status: "FAILED", razorpayPaymentId: paymentId },
      });
      return;
    }

    const rental = await prisma.rental.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (rental) {
      await prisma.rental.update({
        where: { id: rental.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      await prisma.payment.updateMany({
        where: { rentalId: rental.id },
        data: { status: "FAILED", razorpayPaymentId: paymentId },
      });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", razorpayPaymentId: paymentId },
    });
  }

  // ── Custom Plan payments ──────────────────────────────────────────────────

  async createCustomPlanOrder(
    planId: string,
    userId: string,
  ): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    key: string | undefined;
  }> {
    const plan = await prisma.customPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError("Custom plan not found", 404);
    if (plan.status !== "QUOTED")
      throw new AppError("Plan is not in QUOTED status", 400);
    if (plan.submittedBy !== userId) throw new AppError("Unauthorized", 403);
    if (!plan.quotedAmount || plan.quotedAmount <= 0)
      throw new AppError("No valid quoted amount", 400);

    const amountPaise = Math.round(plan.quotedAmount * 100);
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `cp_${plan.id.replace(/-/g, "").substring(0, 20)}`,
    };

    const order = await razorpay.orders.create(options);

    await prisma.payment.create({
      data: {
        customPlanId: planId,
        razorpayOrderId: order.id,
        amount: plan.quotedAmount,
        status: "INITIATED",
      },
    });

    return {
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyCustomPlanPayment(
    planId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new AppError("Invalid payment signature", 400);
    }

    // Update payment record
    await prisma.payment.updateMany({
      where: { customPlanId: planId, razorpayOrderId: orderId },
      data: { status: "PAID", razorpayPaymentId: paymentId },
    });

    // Update custom plan status to ACCEPTED
    await prisma.customPlan.update({
      where: { id: planId },
      data: { status: "ACCEPTED" },
    });

    return true;
  }
}
