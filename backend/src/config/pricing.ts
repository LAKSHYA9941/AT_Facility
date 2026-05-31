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
