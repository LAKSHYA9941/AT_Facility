import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../../shared/db/prisma";
import { PaymentStatus } from "../../shared/types/enums";
import { messagingService } from "../notifications/messaging.service";

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
  ) {
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
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifySignature(orderId: string, paymentId: string, signature: string) {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new Error("Invalid payment signature");
    }

    await this.markOrderAsPaid(orderId, paymentId);
    return true;
  }

  async createTripOrder(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "PENDING_PAYMENT")
      throw new Error("Trip is not pending payment");
    if (trip.userId !== userId) throw new Error("Unauthorized");

    const amountPaise = Math.round(trip.amountPaidUpfront * 100);
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `trip_${trip.id.replace(/-/g, "").substring(0, 20)}`,
    };

    const order = await razorpay.orders.create(options);

    await prisma.payment.upsert({
      where: { tripId },
      create: {
        tripId,
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
  ) {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new Error("Invalid payment signature");
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
      where: { tripId },
      data: { status: "CAPTURED" },
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

  async bypassTripSignature(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "PENDING_PAYMENT") return true; // Already handled
    if (trip.userId !== userId) throw new Error("Unauthorized");

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CONFIRMED" },
      include: { waypoints: { orderBy: { orderIndex: "asc" } }, user: true },
    });

    await prisma.payment.create({
      data: {
        tripId,
        razorpayOrderId: `bypass_${Date.now()}`,
        amount: trip.amountPaidUpfront,
        status: "CAPTURED",
      },
    });

    if (updatedTrip.user?.phone && updatedTrip.startOtp) {
      messagingService.sendCustomerBookingConfirmed(
        updatedTrip.id,
        updatedTrip.user.phone,
        updatedTrip.startOtp,
      );
    }
    const pickup = updatedTrip.waypoints[0]?.address || "Pickup";
    const drop =
      updatedTrip.waypoints[updatedTrip.waypoints.length - 1]?.address ||
      "Drop";
    messagingService.sendNewJobAvailable(
      updatedTrip.id,
      updatedTrip.vehicleSegment,
      pickup,
      drop,
    );

    return true;
  }

  async bypassTripBalance(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.userId !== userId) throw new Error("Unauthorized");
    if (trip.balanceRemaining <= 0) throw new Error("No balance remaining");

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { balanceRemaining: 0 },
    });

    await prisma.payment.create({
      data: {
        tripId,
        razorpayOrderId: `bypass_bal_${Date.now()}`,
        amount: trip.balanceRemaining,
        status: "CAPTURED",
      },
    });

    return updatedTrip;
  }

  async handleWebhook(event: string, payload: any) {
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

  private async markOrderAsPaid(orderId: string, paymentId: string) {
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

    // Try finding payment directly by orderId
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
          payment.trip.waypoints[payment.trip.waypoints.length - 1]?.address ||
          "Drop";
        messagingService.sendNewJobAvailable(
          payment.trip.id,
          payment.trip.vehicleSegment,
          pickup,
          drop,
        );
      }
      return;
    }

    console.warn(
      `Webhook received for order ${orderId} but no DB record found.`,
    );
  }

  private async markOrderAsFailed(orderId: string, paymentId: string) {
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

    // Try finding payment directly by orderId
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", razorpayPaymentId: paymentId },
      });
      return;
    }
  }

  // ── Custom Plan payments ──────────────────────────────────────────────────

  async createCustomPlanOrder(planId: string, userId: string) {
    const plan = await prisma.customPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Custom plan not found");
    if (plan.status !== "QUOTED")
      throw new Error("Plan is not in QUOTED status");
    if (plan.submittedBy !== userId) throw new Error("Unauthorized");
    if (!plan.quotedAmount || plan.quotedAmount <= 0)
      throw new Error("No valid quoted amount");

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
  ) {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== signature) {
      throw new Error("Invalid payment signature");
    }

    // Update payment record
    await prisma.payment.updateMany({
      where: { customPlanId: planId, razorpayOrderId: orderId },
      data: { status: "CAPTURED", razorpayPaymentId: paymentId },
    });

    // Update custom plan status to ACCEPTED
    await prisma.customPlan.update({
      where: { id: planId },
      data: { status: "ACCEPTED" },
    });

    return true;
  }

  async bypassCustomPlanPayment(planId: string, userId: string) {
    const plan = await prisma.customPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Custom plan not found");
    if (plan.status !== "QUOTED")
      throw new Error("Plan is not in QUOTED status");
    if (plan.submittedBy !== userId) throw new Error("Unauthorized");

    await prisma.payment.create({
      data: {
        customPlanId: planId,
        razorpayOrderId: `bypass_cp_${Date.now()}`,
        amount: plan.quotedAmount ?? 0,
        status: "CAPTURED",
      },
    });

    await prisma.customPlan.update({
      where: { id: planId },
      data: { status: "ACCEPTED" },
    });

    return true;
  }
}
