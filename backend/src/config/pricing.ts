import { VehicleSegment } from "@prisma/client";

export const FLAT_RATES: Record<string, number> = {
  [VehicleSegment.HATCHBACK]: 3500,
  [VehicleSegment.SEDAN]: 3500,
  [VehicleSegment.MINI_SUV]: 4000,
  [VehicleSegment.SUV]: 5000,
  [VehicleSegment.TEMPO]: 6000,
};

export const SEGMENT_RATES = {
  [VehicleSegment.HATCHBACK]: 11,
  [VehicleSegment.SEDAN]: 12,
  [VehicleSegment.MINI_SUV]: 14,
  [VehicleSegment.SUV]: 16,
  [VehicleSegment.TEMPO]: 25,
};

export const ALL_INCLUSIVE_FLAT_SURCHARGE = 500;
export const ALL_INCLUSIVE_PER_KM_SURCHARGE = 3;

export const ALL_INCLUSIVE_FLAT_RATES: Record<string, number> =
  Object.fromEntries(
    Object.entries(FLAT_RATES).map(([segment, rate]) => [
      segment,
      rate + ALL_INCLUSIVE_FLAT_SURCHARGE,
    ]),
  );

export const ALL_INCLUSIVE_SEGMENT_RATES: Record<string, number> =
  Object.fromEntries(
    Object.entries(SEGMENT_RATES).map(([segment, rate]) => [
      segment,
      rate + ALL_INCLUSIVE_PER_KM_SURCHARGE,
    ]),
  );

export const ALL_INCLUSIVE_FEATURES = [
  "Fuel/Petrol",
  "Car service & maintenance",
  "Tolls & state taxes",
  "Parking charges",
  "Driver allowance",
  "Driver assists with stops & breaks on request",
];

export const EXCLUSION_FEATURES = ["Fuel/Petrol"];

export const EXCLUSION_NOT_INCLUDED = [
  "Tolls & state taxes",
  "Parking charges",
  "Driver allowance",
  "Car service & maintenance",
];

export function calculateFare(
  segment: VehicleSegment,
  distanceKm: number,
  days: number,
  pricingTier: "ALL_INCLUSIVE" | "EXCLUSION",
): { baseFare: number; driverAllowance: number; totalFare: number } {
  const perKmRate =
    pricingTier === "ALL_INCLUSIVE"
      ? ALL_INCLUSIVE_SEGMENT_RATES[segment]
      : SEGMENT_RATES[segment];

  const baseFare = distanceKm * perKmRate;

  // Driver allowance is covered in All-Inclusive base rate, but explicitly added for Exclusion.
  const driverAllowancePerDay = 300;
  const driverAllowance =
    pricingTier === "ALL_INCLUSIVE" ? 0 : days * driverAllowancePerDay;

  return {
    baseFare,
    driverAllowance,
    totalFare: baseFare + driverAllowance,
  };
}
