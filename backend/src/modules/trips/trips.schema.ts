import { z } from "zod/v4";

export const estimateTripSchema = {
  body: z.object({
    waypoints: z
      .array(
        z.object({
          lat: z.number(),
          lng: z.number(),
        }),
      )
      .min(2),
    passengerCount: z.number().min(1).max(50),
    startDate: z.string().datetime().optional(), // Or you can keep it as string if datetime is not strictly ISO
    endDate: z.string().datetime().optional(),
  }),
};

export const createTripSchema = {
  body: z.object({
    tripType: z.string(),
    waypoints: z
      .array(
        z.object({
          address: z.string(),
          lat: z.number(),
          lng: z.number(),
        }),
      )
      .min(2),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    passengerCount: z.number().min(1),
    vehicleSegment: z.string(),
    totalFare: z.number(),
    selectedPercentage: z.coerce
      .number()
      .refine((val) => [25, 50, 100].includes(val)),
  }),
};

export const cancelTripSchema = {
  body: z.object({
    reason: z.string().optional(),
  }),
};
