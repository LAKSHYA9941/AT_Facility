import { create } from "zustand";
import { connectSocket, getSocket, EVENTS } from "../utils/socket";
import { api } from "../utils/api";
import { useAuthStore } from "./auth";

type DriverStore = {
  isOnline: boolean;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  sendLocation: (lat: number, lng: number, heading?: number) => void;
  acceptJob: (tripId: string) => void;
  rideRequest: any | null;
  acceptRide: (rideId: string) => Promise<void>;
  declineRide: (rideId: string) => Promise<void>;
};

export const useDriverStore = create<DriverStore>((set, get) => ({
  isOnline: false,
  rideRequest: null,

  goOnline: async () => {
    const socket = await connectSocket();
    socket.emit(EVENTS.DRIVER_ONLINE);
    set({ isOnline: true });

    // Listen to new trip job requests when online
    socket.on(EVENTS.TRIP_JOB_AVAILABLE, (job) => {
      const mappedRequest = {
        rideId: job.id || job.tripId,
        segment: job.vehicleSegment,
        passenger: { name: job.passengerName || "Passenger" },
        fare: job.totalFare,
        pickup: {
          address: job.waypoints?.[0]?.address || job.pickupAddress || "",
        },
        drop: {
          address:
            job.waypoints?.[job.waypoints.length - 1]?.address ||
            job.destinationAddress ||
            "",
        },
        distance: job.distance || 0,
      };
      set({ rideRequest: mappedRequest });
    });
  },

  goOffline: async () => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_OFFLINE);
    socket?.off(EVENTS.TRIP_JOB_AVAILABLE);
    set({ isOnline: false, rideRequest: null });
  },

  sendLocation: (lat, lng, heading) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_LOCATION, { lat, lng, heading });
  },

  acceptJob: (tripId) => {
    const socket = getSocket();
    const state = useAuthStore.getState();
    if (state.user) {
      socket?.emit(EVENTS.DRIVER_ACCEPT_JOB, {
        tripId,
        driverId: state.user.id,
      });
    }
  },

  acceptRide: async (rideId) => {
    const socket = getSocket();
    const state = useAuthStore.getState();
    if (socket && state.user) {
      socket.emit(EVENTS.DRIVER_ACCEPT_JOB, {
        tripId: rideId,
        driverId: state.user.id,
      });
    }
    set({ rideRequest: null });
  },

  declineRide: async (rideId) => {
    set({ rideRequest: null });
  },
}));
