import { VehicleSegment } from "../../shared/types/enums";

// ── Vehicle capacity & pricing config ────────────────────────

type SegmentConfig = {
  normalCapacity: number;
  maxExtra: number; // max extra passengers allowed (200/head)
  forceUpgradeAfter: number; // passenger count that forces next segment
  perKmRate: number; // INR per km
};

const SEGMENT_CONFIG: Record<string, SegmentConfig> = {
  [VehicleSegment.SWIFT]: {
    normalCapacity: 4,
    maxExtra: 2,
    forceUpgradeAfter: 6,
    perKmRate: 12,
  },
  [VehicleSegment.COMFORT]: {
    normalCapacity: 4,
    maxExtra: 2,
    forceUpgradeAfter: 6,
    perKmRate: 18,
  },
  [VehicleSegment.PRESTIGE]: {
    normalCapacity: 6,
    maxExtra: 3,
    forceUpgradeAfter: 9,
    perKmRate: 28,
  },
  [VehicleSegment.VOYAGER]: {
    normalCapacity: 7,
    maxExtra: 3,
    forceUpgradeAfter: 10,
    perKmRate: 22,
  },
  [VehicleSegment.TEMPO]: {
    normalCapacity: 12,
    maxExtra: 2,
    forceUpgradeAfter: 14,
    perKmRate: 35,
  },
  [VehicleSegment.BUS]: {
    normalCapacity: 20,
    maxExtra: 0,
    forceUpgradeAfter: Infinity, // cannot upgrade beyond BUS
    perKmRate: 55,
  },
  [VehicleSegment.ECORIDE]: {
    normalCapacity: 4,
    maxExtra: 2,
    forceUpgradeAfter: 6,
    perKmRate: 10,
  },
  [VehicleSegment.FLEXDRIVE]: {
    normalCapacity: 5,
    maxExtra: 0,
    forceUpgradeAfter: Infinity,
    perKmRate: 0, // rental only — not per km
  },
};

// Force upgrade order
const UPGRADE_ORDER: VehicleSegment[] = [
  VehicleSegment.SWIFT,
  VehicleSegment.COMFORT,
  VehicleSegment.PRESTIGE,
  VehicleSegment.VOYAGER,
  VehicleSegment.TEMPO,
  VehicleSegment.BUS,
];

const EXTRA_PER_HEAD = 200; // INR per extra passenger
const ROUND_TRIP_DISCOUNT_PERCENT = 0.12; // 12%
const DRIVER_ALLOWANCE_PER_DAY = 500; // INR — excludes pickup day

// ── Fare result type ─────────────────────────────────────────

export type TripFareBreakdown = {
  suggestedSegment: VehicleSegment;
  actualSegment: VehicleSegment;
  extraPassengers: number;
  extraHeadCharge: number;
  forceUpgraded: boolean;
  baseFare: number;
  perKmRate: number;
  driverAllowance: number;
  roundTripDiscount: number;
  totalFare: number;
};

// ── Main fare calculator ─────────────────────────────────────

export const calculateTripFare = (params: {
  passengerCount: number;
  preferredSegment: VehicleSegment;
  distanceKm: number;
  totalDays: number;
  isRoundTrip: boolean;
}): TripFareBreakdown => {
  const {
    passengerCount,
    preferredSegment,
    distanceKm,
    totalDays,
    isRoundTrip,
  } = params;

  let suggestedSegment = preferredSegment;
  let actualSegment = preferredSegment;
  let forceUpgraded = false;

  // Determine segment based on passenger count
  let config = SEGMENT_CONFIG[actualSegment];

  // Check if force upgrade needed
  if (passengerCount > config.forceUpgradeAfter) {
    forceUpgraded = true;
    const currentIdx = UPGRADE_ORDER.indexOf(actualSegment as VehicleSegment);

    // Walk up the upgrade chain until we find a segment that fits
    for (let i = currentIdx + 1; i < UPGRADE_ORDER.length; i++) {
      const nextSegment = UPGRADE_ORDER[i];
      const nextConfig = SEGMENT_CONFIG[nextSegment];

      if (passengerCount <= nextConfig.normalCapacity + nextConfig.maxExtra) {
        actualSegment = nextSegment;
        config = nextConfig;
        break;
      }

      // If we've reached BUS and still can't fit — use BUS anyway
      if (nextSegment === VehicleSegment.BUS) {
        actualSegment = nextSegment;
        config = nextConfig;
        break;
      }
    }
  }

  // Calculate extra passengers beyond normal capacity
  const extraPassengers = Math.max(
    0,
    Math.min(passengerCount - config.normalCapacity, config.maxExtra),
  );
  const extraHeadCharge = parseFloat(
    (extraPassengers * EXTRA_PER_HEAD).toFixed(2),
  );

  // Base fare = distance × per km rate
  const perKmRate = config.perKmRate;
  const baseFare = parseFloat((distanceKm * perKmRate).toFixed(2));

  // Driver allowance = 500 × (totalDays - 1), minimum 0
  const driverAllowance = parseFloat(
    (Math.max(0, totalDays - 1) * DRIVER_ALLOWANCE_PER_DAY).toFixed(2),
  );

  // Round trip discount = 12% off base fare
  const roundTripDiscount = isRoundTrip
    ? parseFloat((baseFare * ROUND_TRIP_DISCOUNT_PERCENT).toFixed(2))
    : 0;

  // Total = baseFare - roundTripDiscount + driverAllowance + extraHeadCharge
  const totalFare = parseFloat(
    (baseFare - roundTripDiscount + driverAllowance + extraHeadCharge).toFixed(
      2,
    ),
  );

  return {
    suggestedSegment: suggestedSegment as VehicleSegment,
    actualSegment: actualSegment as VehicleSegment,
    extraPassengers,
    extraHeadCharge,
    forceUpgraded,
    baseFare,
    perKmRate,
    driverAllowance,
    roundTripDiscount,
    totalFare,
  };
};

// ── Helpers ──────────────────────────────────────────────────

export const getSegmentConfig = (segment: VehicleSegment) => {
  return SEGMENT_CONFIG[segment];
};
