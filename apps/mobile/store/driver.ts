import { create } from "zustand";
import { connectSocket, getSocket, EVENTS } from "../utils/socket";
import { api } from "../utils/api";

type RideRequest = {
  rideId: string;
  passenger: { name: string; phone: string };
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  fare: number;
  distance: number;
  segment: string;
  etaToPickup: number;
};

type DriverStore = {
  isOnline: boolean;
  rideRequest: RideRequest | null;
  activeRideId: string | null;
  rideStatus: string | null;

  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  sendLocation: (lat: number, lng: number, heading?: number) => void;
  acceptRide: (rideId: string) => void;
  declineRide: (rideId: string) => void;
  markArrived: (rideId: string) => void;
  startRide: (rideId: string, otp: string) => void;
  completeRide: (rideId: string) => void;
  listenForRides: () => Promise<void>;
};

export const useDriverStore = create<DriverStore>((set, get) => ({
  isOnline: false,
  rideRequest: null,
  activeRideId: null,
  rideStatus: null,

  goOnline: async () => {
    const socket = await connectSocket();
    socket.emit(EVENTS.DRIVER_ONLINE);
    set({ isOnline: true });
    get().listenForRides();
  },

  goOffline: async () => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_OFFLINE);
    set({ isOnline: false, rideRequest: null });
  },

  sendLocation: (lat, lng, heading) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_LOCATION, { lat, lng, heading });
  },

  acceptRide: (rideId) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_ACCEPT, { rideId });
    set({ rideRequest: null, activeRideId: rideId, rideStatus: "confirmed" });
  },

  declineRide: (rideId) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_DECLINE, { rideId });
    set({ rideRequest: null });
  },

  markArrived: (rideId) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_ARRIVED, { rideId });
    set({ rideStatus: "arriving" });
  },

  startRide: (rideId, otp) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_STARTED, { rideId, otp });
    set({ rideStatus: "in_ride" });
  },

  completeRide: (rideId) => {
    const socket = getSocket();
    socket?.emit(EVENTS.DRIVER_COMPLETED, { rideId });
    set({ activeRideId: null, rideStatus: null });
  },

  listenForRides: async () => {
    const socket = await connectSocket();

    socket.on(EVENTS.RIDE_REQUEST, (data: RideRequest) => {
      console.log("📨 New ride request:", data.rideId);
      set({ rideRequest: data });
    });

    socket.on(EVENTS.RIDE_CANCELLED, () => {
      set({ rideRequest: null, activeRideId: null, rideStatus: null });
    });
  },
}));
