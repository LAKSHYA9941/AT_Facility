import { create } from "zustand";
import { router } from "expo-router";
import { api } from "../utils/api";
import { SecureStorage } from "../utils/secureStorage";

type Role = "CUSTOMER" | "DRIVER" | "ADMIN";

type User = {
  id: string;
  phone: string;
  name: string | null;
  email?: string | null;
  role: Role;
  profileComplete: boolean;
  status: string;
};

type AuthStore = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedRole: Role;

  setSelectedRole: (role: Role) => void;
  initialize: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (
    phone: string,
    otp: string,
  ) => Promise<{ isNewUser: boolean; role: Role }>;
  completeProfile: (name: string, email?: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
};

const routeByRole = (role: Role) => {
  if (role === "CUSTOMER") router.replace("/(customer)/ride");
  if (role === "DRIVER") router.replace("/(driver)/home");
  if (role === "ADMIN") router.replace("/(admin)/dashboard");
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  selectedRole: "CUSTOMER",

  setSelectedRole: (role) => set({ selectedRole: role }),

  // called on every app open
  initialize: async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const success = await get().refresh();
      if (!success) {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch {
      await SecureStorage.clear();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  sendOtp: async (phone: string) => {
    const { selectedRole } = get();
    await api.post("/api/auth/send-otp", { phone, role: selectedRole });
  },

  verifyOtp: async (phone: string, otp: string) => {
    const { selectedRole } = get();
    const deviceId = await SecureStorage.getDeviceId();
    const deviceName = "Mobile Device";

    const { data } = await api.post("/api/auth/verify-otp", {
      phone,
      otp,
      deviceId,
      deviceName,
      role: selectedRole,
    });

    await SecureStorage.setTokens(
      data.data.accessToken,
      data.data.refreshToken,
    );
    await SecureStorage.setUser(data.data.user);
    set({ user: data.data.user, isAuthenticated: true });

    return {
      isNewUser: data.data.isNewUser,
      role: data.data.user.role as Role,
    };
  },

  completeProfile: async (name: string, email?: string) => {
    const { data } = await api.put("/api/auth/complete-profile", {
      name,
      email,
    });
    await SecureStorage.setUser(data.data);
    set({ user: data.data });
  },

  refresh: async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      const deviceId = await SecureStorage.getDeviceId();

      if (!refreshToken) return false;

      const { data } = await api.post("/api/auth/refresh", {
        refreshToken,
        deviceId,
      });

      await SecureStorage.setTokens(
        data.data.accessToken,
        data.data.refreshToken,
      );
      await SecureStorage.setUser(
        data.data.user || (await SecureStorage.getUser()),
      );

      const user = data.data.user || (await SecureStorage.getUser());
      set({ user, isAuthenticated: true, isLoading: false });

      routeByRole(user.role);
      return true;
    } catch {
      await SecureStorage.clear();
      set({ isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken) {
        await api.post("/api/auth/logout", { refreshToken });
      }
    } finally {
      await SecureStorage.clear();
      set({ user: null, isAuthenticated: false });
      router.replace("/(auth)/login");
    }
  },

  adminLogin: async (email: string, password: string) => {
    const deviceId = await SecureStorage.getDeviceId();
    const deviceName = "Admin Device";

    const { data } = await api.post("/api/auth/admin/login", {
      email,
      password,
      deviceId,
      deviceName,
    });

    await SecureStorage.setTokens(
      data.data.accessToken,
      data.data.refreshToken,
    );
    await SecureStorage.setUser(data.data.user);
    set({ user: data.data.user, isAuthenticated: true });
  },
}));
