import { create } from "zustand";
import { api } from "../utils/api";
import { connectSocket, getSocket, EVENTS } from "../utils/socket";

type RideStatus =
  | "idle"
  | "estimating"
  | "searching"
  | "confirmed"
  | "arriving"
  | "in_ride"
  | "completed"
  | "cancelled";

type FareEstimate = {
  baseFare: number;
  distanceFare: number;
  surgeFare: number;
  totalFare: number;
  surgeMultiplier: number;
  perKmRate: number;
};

type AssignedDriver = {
  name: string | null;
  phone: string;
  rating: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
  } | null;
};

type DriverLocation = {
  lat: number;
  lng: number;
  heading?: number;
};

type RideStore = {
  // State
  status: RideStatus;
  rideId: string | null;
  fare: FareEstimate | null;
  route: { distanceKm: number; durationMin: number } | null;
  etaMinutes: number | null;
  driver: AssignedDriver | null;
  driverLocation: DriverLocation | null;
  otp: string | null;
  error: string | null;

  // Actions
  estimateFare: (
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    segment: string,
    passengers?: number,
  ) => Promise<void>;

  createRide: (params: {
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropAddress: string;
    dropLat: number;
    dropLng: number;
    segment: string;
    passengerCount?: number;
    paymentMethod?: string;
  }) => Promise<void>;

  cancelRide: (reason?: string) => Promise<void>;
  resetRide: () => void;
  listenToRide: () => void;
};

const INITIAL_STATE = {
  status: "idle" as RideStatus,
  rideId: null,
  fare: null,
  route: null,
  etaMinutes: null,
  driver: null,
  driverLocation: null,
  otp: null,
  error: null,
};

export const useRideStore = create<RideStore>((set, get) => ({
  ...INITIAL_STATE,

  estimateFare: async (
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    segment,
    passengers = 1,
  ) => {
    set({ status: "estimating", error: null });
    try {
      const { data } = await api.post("/api/rides/estimate", {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        segment,
        passengerCount: passengers,
      });
      set({
        fare: data.data.fare,
        route: data.data.route,
        etaMinutes: data.data.etaMinutes,
        status: "idle",
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || "Failed to estimate fare",
        status: "idle",
      });
    }
  },

  createRide: async (params) => {
    set({ status: "searching", error: null });
    try {
      const { data } = await api.post("/api/rides/create", {
        ...params,
        passengerCount: params.passengerCount || 1,
        paymentMethod: params.paymentMethod || "CASH",
      });
      set({ rideId: data.data.id, otp: data.data.otp });
      get().listenToRide();
    } catch (err: any) {
      set({
        error: err.response?.data?.message || "Failed to create ride",
        status: "idle",
      });
    }
  },

  cancelRide: async (reason) => {
    const { rideId } = get();
    if (!rideId) return;
    try {
      await api.put(`/api/rides/${rideId}/cancel`, { reason });
      set({ ...INITIAL_STATE });
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to cancel" });
    }
  },

  listenToRide: async () => {
    const socket = await connectSocket();

    socket.on(EVENTS.RIDE_ASSIGNED, (data) => {
      set({ status: "confirmed", driver: data.driver });
      console.log("✅ Driver assigned:", data.driver?.name);
    });

    socket.on(EVENTS.RIDE_DRIVER_LOCATION, (data: DriverLocation) => {
      set({ driverLocation: data });
    });

    socket.on(EVENTS.RIDE_DRIVER_ARRIVED, () => {
      set({ status: "arriving" });
    });

    socket.on(EVENTS.RIDE_STARTED, () => {
      set({ status: "in_ride" });
    });

    socket.on(EVENTS.RIDE_COMPLETED, (data) => {
      set({ status: "completed" });
      console.log("✅ Ride completed, fare:", data.fare);
    });

    socket.on(EVENTS.RIDE_NO_DRIVERS, () => {
      set({ status: "cancelled", error: "No drivers available nearby" });
    });

    socket.on(EVENTS.RIDE_CANCELLED, () => {
      set({ status: "cancelled", error: "Ride was cancelled" });
    });
  },

  resetRide: () => set({ ...INITIAL_STATE }),
}));
