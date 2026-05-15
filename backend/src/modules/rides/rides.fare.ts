import { VehicleSegment } from "../../shared/types/enums";

// Base fare + per km rate per segment (in INR)
const FARE_CONFIG: Record<
  VehicleSegment,
  {
    base: number; // flat base fare
    perKm: number; // per km rate
    perMin: number; // per minute waiting/slow traffic
    minFare: number; // minimum fare regardless of distance
    capacity: number; // max passengers
    extraPerHead: number; // charge per extra passenger beyond capacity
  }
> = {
  [VehicleSegment.SWIFT]: {
    base: 30,
    perKm: 12,
    perMin: 1,
    minFare: 50,
    capacity: 4,
    extraPerHead: 20,
  },
  [VehicleSegment.COMFORT]: {
    base: 50,
    perKm: 18,
    perMin: 2,
    minFare: 80,
    capacity: 4,
    extraPerHead: 30,
  },
  [VehicleSegment.PRESTIGE]: {
    base: 100,
    perKm: 28,
    perMin: 3,
    minFare: 150,
    capacity: 4,
    extraPerHead: 50,
  },
  [VehicleSegment.VOYAGER]: {
    base: 80,
    perKm: 16,
    perMin: 2,
    minFare: 120,
    capacity: 8,
    extraPerHead: 25,
  },
  [VehicleSegment.ECORIDE]: {
    base: 40,
    perKm: 10,
    perMin: 1,
    minFare: 60,
    capacity: 4,
    extraPerHead: 20,
  },
  [VehicleSegment.FLEXDRIVE]: {
    base: 0,
    perKm: 0,
    perMin: 0,
    minFare: 0,
    capacity: 5,
    extraPerHead: 0,
    // Flexdrive uses daily rental pricing — not per km
  },
  [VehicleSegment.TEMPO]: {
    base: 150,
    perKm: 35,
    perMin: 3,
    minFare: 300,
    capacity: 12,
    extraPerHead: 200,
  },
  [VehicleSegment.BUS]: {
    base: 300,
    perKm: 55,
    perMin: 5,
    minFare: 500,
    capacity: 20,
    extraPerHead: 0,
  },
};

// Surge multiplier based on hour of day
const getSurgeMultiplier = (): number => {
  const hour = new Date().getHours();
  // Morning peak: 8-10am
  if (hour >= 8 && hour <= 10) return 1.3;
  // Evening peak: 5-8pm
  if (hour >= 17 && hour <= 20) return 1.4;
  // Late night: 11pm-5am
  if (hour >= 23 || hour <= 5) return 1.2;
  return 1.0;
};

export type FareBreakdown = {
  baseFare: number;
  distanceFare: number;
  surgeFare: number;
  extraHeadFare: number;
  totalFare: number;
  surgeMultiplier: number;
  perKmRate: number;
};

export const calculateFare = (
  segment: VehicleSegment,
  distanceKm: number,
  durationMin: number,
  passengerCount: number = 1,
): FareBreakdown => {
  const config = FARE_CONFIG[segment];
  const surgeMultiplier = getSurgeMultiplier();

  const baseFare = config.base;
  const distanceFare = distanceKm * config.perKm + durationMin * config.perMin;
  const subTotal = Math.max(baseFare + distanceFare, config.minFare);
  const surgeFare = parseFloat(
    (subTotal * surgeMultiplier - subTotal).toFixed(2),
  );

  // Extra passengers beyond capacity
  const extraPassengers = Math.max(0, passengerCount - config.capacity);
  const extraHeadFare = extraPassengers * config.extraPerHead;

  const totalFare = parseFloat(
    (subTotal + surgeFare + extraHeadFare).toFixed(2),
  );

  return {
    baseFare: parseFloat(baseFare.toFixed(2)),
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    surgeFare,
    extraHeadFare,
    totalFare,
    surgeMultiplier,
    perKmRate: config.perKm,
  };
};

export const getSegmentCapacity = (segment: VehicleSegment): number => {
  return FARE_CONFIG[segment].capacity;
};

export const getFareConfig = (segment: VehicleSegment) => {
  return FARE_CONFIG[segment];
};
