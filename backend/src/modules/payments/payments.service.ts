import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../../shared/db/prisma";
import { PaymentStatus } from "../../shared/types/enums";

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
    if (notes?.type === "RIDE" && notes?.id) {
      await prisma.ride.update({
        where: { id: notes.id },
        data: { razorpayOrderId: order.id },
      });
    } else if (notes?.type === "PACKAGE" && notes?.id) {
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

  async handleWebhook(event: string, payload: any) {
    if (event === "payment.captured") {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.markOrderAsPaid(orderId);
      }
    }
  }

  private async markOrderAsPaid(orderId: string) {
    const ride = await prisma.ride.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (ride) {
      await prisma.ride.update({
        where: { id: ride.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      return;
    }

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
