import { create } from "zustand";

// ---------------------------------------------------------------------------
// Mock Trip & Driver types used across the booking loop
// ---------------------------------------------------------------------------
export type MockDriver = {
  name: string;
  phone: string;
  vehicleModel: string;
  plateNumber: string;
};

export type MockWaypoint = {
  address: string;
  lat: number;
  lng: number;
};

export type MockTripStatus =
  | "CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ENROUTE"
  | "ACTIVE"
  | "COMPLETED";

export type MockTrip = {
  tripId: string;
  status: MockTripStatus;
  driver: MockDriver | null;
  waypoints: MockWaypoint[];
  vehicleSegment: string;
  totalFare: number;
  amountPaidUpfront: number;
  balanceRemaining: number;
  startOtp: string;
  startDate: string;
  endDate: string;
  passengerCount: number;
};

// ---------------------------------------------------------------------------
// Hardcoded route: Laxmi Nagar Metro (Delhi) → Haridwar → Laxman Jhula (Rishikesh)
// Verified coordinates — fed directly into the estimation engine formula.
// ---------------------------------------------------------------------------
export const MOCK_WAYPOINTS: MockWaypoint[] = [
  {
    address: "Laxmi Nagar Metro Station, Delhi",
    lat: 28.6306,
    lng: 77.2776,
  },
  {
    address: "Har Ki Pauri, Haridwar, Uttarakhand",
    lat: 29.9457,
    lng: 78.1642,
  },
  {
    address: "Laxman Jhula, Rishikesh, Uttarakhand",
    lat: 30.1264,
    lng: 78.33,
  },
];

// ---------------------------------------------------------------------------
// Mock estimation data — pre-computed using the same formula as the backend:
//   Leg 1 (Delhi→Haridwar): ~228.9 km
//   Leg 2 (Haridwar→Rishikesh): ~35.4 km
//   totalKm ≈ 264 km
//   5 days → effectiveKm = max(264, 5×250) = 1250 km
//   driverAllowance = 5 × 500 = ₹2500
//   Rates: HATCHBACK=11, SEDAN=13, MINI_SUV=15, SUV=18, TEMPO=22 (per km)
// ---------------------------------------------------------------------------
export const MOCK_FARE_ESTIMATES = {
  days: 5,
  effectiveKm: 1250,
  estimates: [
    {
      segment: "HATCHBACK",
      baseFare: 13750,
      driverAllowance: 2500,
      totalFare: 16250,
      paymentTiers: {
        pct25: { upfront: 4063, balance: 12187 },
        pct50: { upfront: 8125, balance: 8125 },
        pct100: { upfront: 16250, balance: 0 },
      },
    },
    {
      segment: "SEDAN",
      baseFare: 16250,
      driverAllowance: 2500,
      totalFare: 18750,
      paymentTiers: {
        pct25: { upfront: 4688, balance: 14062 },
        pct50: { upfront: 9375, balance: 9375 },
        pct100: { upfront: 18750, balance: 0 },
      },
    },
    {
      segment: "MINI_SUV",
      baseFare: 18750,
      driverAllowance: 2500,
      totalFare: 21250,
      paymentTiers: {
        pct25: { upfront: 5313, balance: 15937 },
        pct50: { upfront: 10625, balance: 10625 },
        pct100: { upfront: 21250, balance: 0 },
      },
    },
    {
      segment: "SUV",
      baseFare: 22500,
      driverAllowance: 2500,
      totalFare: 25000,
      paymentTiers: {
        pct25: { upfront: 6250, balance: 18750 },
        pct50: { upfront: 12500, balance: 12500 },
        pct100: { upfront: 25000, balance: 0 },
      },
    },
    {
      segment: "TEMPO",
      baseFare: 27500,
      driverAllowance: 2500,
      totalFare: 30000,
      paymentTiers: {
        pct25: { upfront: 7500, balance: 22500 },
        pct50: { upfront: 15000, balance: 15000 },
        pct100: { upfront: 30000, balance: 0 },
      },
    },
  ],
};

// Mock driver that gets "assigned" after payment
export const MOCK_DRIVER: MockDriver = {
  name: "Rajesh Kumar",
  phone: "+91 98765 43210",
  vehicleModel: "Swift Dzire",
  plateNumber: "DL 5C AB 1234",
};

// ---------------------------------------------------------------------------
// Zustand Store
// ---------------------------------------------------------------------------
type MockStore = {
  isMockMode: boolean;
  toggleMockMode: () => void;
  setMockMode: (val: boolean) => void;

  activeMockTrip: MockTrip | null;
  setActiveMockTrip: (trip: MockTrip) => void;
  updateActiveMockTrip: (updates: Partial<MockTrip>) => void;
  clearActiveMockTrip: () => void;
};

export const useMockStore = create<MockStore>((set) => ({
  isMockMode: false,
  toggleMockMode: () => set((state) => ({ isMockMode: !state.isMockMode })),
  setMockMode: (val) => set({ isMockMode: val }),

  activeMockTrip: null,
  setActiveMockTrip: (trip) => set({ activeMockTrip: trip }),
  updateActiveMockTrip: (updates) =>
    set((state) => ({
      activeMockTrip: state.activeMockTrip
        ? { ...state.activeMockTrip, ...updates }
        : null,
    })),
  clearActiveMockTrip: () => set({ activeMockTrip: null }),
}));
