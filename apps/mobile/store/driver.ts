import { create } from "zustand";
import { api } from "../utils/api";

type DriverStore = {
  isOnline: boolean;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
};

export const useDriverStore = create<DriverStore>((set) => ({
  isOnline: false,

  goOnline: async () => {
    try {
      await api.post("/api/driver/status", { isOnline: true });
      set({ isOnline: true });
    } catch (error: any) {
      console.error("Failed to go online:", error);
      throw error;
    }
  },

  goOffline: async () => {
    try {
      await api.post("/api/driver/status", { isOnline: false });
      set({ isOnline: false });
    } catch (error: any) {
      console.error("Failed to go offline:", error);
      throw error;
    }
  },

  acceptRide: async (rideId: string) => {
    try {
      await api.post(`/api/trips/${rideId}/accept`);
    } catch (error: any) {
      console.error("Failed to accept ride:", error);
      throw error;
    }
  },
}));
