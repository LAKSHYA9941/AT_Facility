import axios from "axios";
import prisma from "../../shared/db/prisma";
import { logger } from "../../shared/logger/logger";
import { VehicleSegment } from "@prisma/client";

// Base MSG91 sender helper
const sendMSG91 = async (
  phone: string,
  templateId: string,
  variables: Record<string, string>,
) => {
  if (process.env.NODE_ENV === "development" || !process.env.MSG91_API_KEY) {
    logger.info(
      { variables },
      `[MSG91-DEV] SMS to ${phone} using ${templateId}`,
    );
    return;
  }

  try {
    await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        template_id: templateId,
        sender: "ATFCLY",
        short_url: "0",
        mobiles: `91${phone}`,
        ...variables,
      },
      {
        headers: { authkey: process.env.MSG91_API_KEY },
      },
    );
  } catch (err: any) {
    logger.error(
      { err: err.response?.data || err.message },
      `Failed to send MSG91 SMS to ${phone}`,
    );
  }
};

const sendWhatsApp = async (
  phone: string,
  templateId: string,
  variables: Record<string, string>,
) => {
  if (process.env.NODE_ENV === "development" || !process.env.MSG91_API_KEY) {
    logger.info(
      { variables },
      `[WhatsApp-DEV] Message to ${phone} using ${templateId}`,
    );
    return;
  }

  // Implementation for WhatsApp API via MSG91
  try {
    // Placeholder for actual WhatsApp API call
    logger.info(`[WhatsApp] Sent to ${phone}`);
  } catch (err: any) {
    logger.error({ err: err.message }, `Failed to send WhatsApp to ${phone}`);
  }
};

export const messagingService = {
  sendCustomerBookingConfirmed: async (
    tripId: string,
    phone: string,
    otp: string,
  ) => {
    sendMSG91(
      phone,
      process.env.MSG91_TEMPLATE_BOOKING_CONFIRMED || "booking_confirmed_temp",
      {
        otp,
      },
    ).catch(console.error);

    await prisma.trip.update({
      where: { id: tripId },
      data: { customerNotifiedAt: new Date() },
    });
  },

  sendDriverAssigned: async (
    tripId: string,
    phone: string,
    driverName: string,
    vehiclePlate: string,
    driverPhone: string,
  ) => {
    sendMSG91(
      phone,
      process.env.MSG91_TEMPLATE_DRIVER_ASSIGNED || "driver_assigned_temp",
      {
        driverName,
        vehiclePlate,
        driverPhone,
      },
    ).catch(console.error);

    await prisma.trip.update({
      where: { id: tripId },
      data: { driverAssignedNotifiedAt: new Date() },
    });
  },

  sendTripCompleted: async (
    tripId: string,
    phone: string,
    totalFare: number,
  ) => {
    sendMSG91(
      phone,
      process.env.MSG91_TEMPLATE_TRIP_COMPLETED || "trip_completed_temp",
      {
        totalFare: totalFare.toString(),
      },
    ).catch(console.error);
  },

  sendNewJobAvailable: async (
    tripId: string,
    segment: VehicleSegment,
    pickup: string,
    drop: string,
  ) => {
    // Find all online drivers in the requested segment
    const drivers = await prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        kycStatus: "VERIFIED",
        segment: segment,
      },
      include: { user: true },
    });

    const driverPhones = drivers.map((d) => d.user.phone).filter(Boolean);

    if (driverPhones.length === 0) return;

    const variables = { pickup, drop };

    // Fire and forget all messages
    for (const phone of driverPhones) {
      sendMSG91(
        phone,
        process.env.MSG91_TEMPLATE_NEW_JOB || "new_job_temp",
        variables,
      ).catch(console.error);
      sendWhatsApp(
        phone,
        process.env.WA_TEMPLATE_NEW_JOB || "new_job_wa_temp",
        variables,
      ).catch(console.error);
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { driverNotifiedAt: new Date() },
    });
  },

  sendTripCancelled: async (phone: string, role: "CUSTOMER" | "DRIVER") => {
    const templateId =
      role === "CUSTOMER"
        ? process.env.MSG91_TEMPLATE_CANCEL_CUSTOMER || "cancel_cust_temp"
        : process.env.MSG91_TEMPLATE_CANCEL_DRIVER || "cancel_driver_temp";

    sendMSG91(phone, templateId, {}).catch(console.error);
  },
};
