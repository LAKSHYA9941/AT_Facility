import { router } from "expo-router";
import { create } from "zustand";
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
  idVerified: boolean;
  idSubmittedAt: string | null;
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
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
    otp?: string;
  }) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  uploadIdProof: (
    idProofType: string,
    frontUri: string,
    backUri?: string,
  ) => Promise<void>;
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

  updateProfile: async (data: {
    name?: string;
    email?: string;
    phone?: string;
    otp?: string;
  }) => {
    const res = await api.put("/api/auth/profile", data);
    const updatedUser = res.data.data;

    // Update local storage and store
    await SecureStorage.setUser(updatedUser);
    set({ user: updatedUser });
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

      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/(onboarding)/welcome");
    }
  },

  deleteAccount: async () => {
    try {
      await api.delete("/api/auth/me");
    } catch (e) {
      console.warn("Delete account API failed or already deleted", e);
    } finally {
      await SecureStorage.clear();
      set({ user: null, isAuthenticated: false });

      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/(onboarding)/welcome");
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

  uploadIdProof: async (
    idProofType: string,
    frontUri: string,
    backUri?: string,
  ) => {
    const { data: frontData } = await api.post(
      "/api/customer/id-proof/upload",
      {
        idProofType,
        side: "front",
      },
    );

    const frontBlob = await (await fetch(frontUri)).blob();
    await fetch(frontData.data.uploadUrl, {
      method: "PUT",
      body: frontBlob,
      headers: { "Content-Type": "image/jpeg" },
    });

    let backKey;
    if (backUri) {
      const { data: backData } = await api.post(
        "/api/customer/id-proof/upload",
        {
          idProofType,
          side: "back",
        },
      );
      const backBlob = await (await fetch(backUri)).blob();
      await fetch(backData.data.uploadUrl, {
        method: "PUT",
        body: backBlob,
        headers: { "Content-Type": "image/jpeg" },
      });
      backKey = backData.data.fileKey;
    }

    const { data: confirmData } = await api.put(
      "/api/customer/id-proof/confirm",
      {
        idProofType,
        frontKey: frontData.data.fileKey,
        backKey,
      },
    );

    const user = get().user;
    if (user) {
      const updatedUser = { ...user, ...confirmData.data };
      await SecureStorage.setUser(updatedUser);
      set({ user: updatedUser });
    }
  },
}));
