import { z } from "zod/v4";

export const estimateTripSchema = {
  body: z
    .object({
      waypoints: z
        .array(
          z.object({
            lat: z.number(),
            lng: z.number(),
          }),
        )
        .min(2)
        .optional(),
      pickupAddress: z.string().optional(),
      destinations: z.array(z.string()).optional(),
      distanceKm: z.number().optional(),
      passengerCount: z.number().min(1).max(50),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .refine(
      (data) => {
        return (
          (data.waypoints && data.waypoints.length >= 2) ||
          (data.pickupAddress &&
            data.destinations &&
            data.destinations.length > 0)
        );
      },
      {
        message:
          "Either waypoints or both pickupAddress and destinations are required",
      },
    ),
};

export const createTripSchema = {
  body: z
    .object({
      tripType: z.string(),
      waypoints: z
        .array(
          z.object({
            address: z.string(),
            lat: z.number(),
            lng: z.number(),
          }),
        )
        .min(2)
        .optional(),
      pickupAddress: z.string().optional(),
      pickupLat: z.number().optional(),
      pickupLng: z.number().optional(),
      destinations: z
        .array(
          z.object({
            address: z.string(),
            lat: z.number(),
            lng: z.number(),
          }),
        )
        .optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      passengerCount: z.number().min(1),
      vehicleSegment: z.string(),
      pricingTier: z.enum(["ALL_INCLUSIVE", "EXCLUSION"]).optional(),
      totalFare: z.number(),
      selectedPercentage: z.coerce
        .number()
        .refine((val) => [25, 50, 100].includes(val)),
    })
    .refine(
      (data) => {
        return (
          (data.waypoints && data.waypoints.length >= 2) ||
          (data.pickupAddress &&
            data.pickupLat !== undefined &&
            data.pickupLng !== undefined &&
            data.destinations &&
            data.destinations.length > 0)
        );
      },
      {
        message:
          "Either waypoints or pickup and destinations must be fully specified",
      },
    ),
};

export const cancelTripSchema = {
  body: z.object({
    reason: z.string().optional(),
  }),
};
