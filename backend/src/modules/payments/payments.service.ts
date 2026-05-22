import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../../shared/db/prisma";
import { PaymentStatus } from "../../shared/types/enums";
import { io } from "../../shared/socket/socket";
import { SOCKET_EVENTS } from "../../shared/socket/socket.events";
import { notificationsService } from "../notifications/notifications.service";

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

    await this.markOrderAsPaid(orderId);
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
      receipt: `trip_${trip.id}`,
    };

    const order = await razorpay.orders.create(options);

    await prisma.payment.create({
      data: {
        tripId,
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

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CONFIRMED" },
      include: { waypoints: { orderBy: { orderIndex: "asc" } } },
    });

    await prisma.payment.update({
      where: { tripId },
      data: { status: "CAPTURED" },
    });

    if (io) {
      io.emit(SOCKET_EVENTS.TRIP_JOB_AVAILABLE, {
        tripId: trip.id,
        vehicleSegment: trip.vehicleSegment,
        pickupAddress: trip.waypoints[0]?.address,
        destinationAddress: trip.waypoints[trip.waypoints.length - 1]?.address,
        startDate: trip.startDate,
        endDate: trip.endDate,
        passengerCount: trip.passengerCount,
        totalKm: 0,
        totalFare: trip.totalFare,
        driverEarning: trip.balanceRemaining,
        waypoints: trip.waypoints,
      });
    }

    await notificationsService.sendPushNotification(
      trip.userId,
      "Your booking is confirmed!",
      `Your trip is confirmed. OTP: ${trip.startOtp}`,
      { tripId },
    );

    return true;
  }

  async handleWebhook(event: string, payload: any) {
    if (event === "payment.captured") {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.markOrderAsPaid(orderId);
      }
    }
  }

  private async markOrderAsPaid(orderId: string) {
    const pkg = await prisma.packageBooking.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (pkg) {
      await prisma.packageBooking.update({
        where: { id: pkg.id },
        data: { paymentStatus: PaymentStatus.PAID },
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
      return;
    }

    console.warn(
      `Webhook received for order ${orderId} but no DB record found.`,
    );
  }
}
