import * as SecureStore from "expo-secure-store";

const KEYS = {
  ACCESS_TOKEN: "atfacility_access_token",
  REFRESH_TOKEN: "atfacility_refresh_token",
  DEVICE_ID: "atfacility_device_id",
  USER: "atfacility_user",
} as const;

export const SecureStorage = {
  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access);
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh);
  },

  getAccessToken: () => SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),

  setUser: async (user: object) => {
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
  },

  getUser: async () => {
    const u = await SecureStore.getItemAsync(KEYS.USER);
    return u ? JSON.parse(u) : null;
  },

  getDeviceId: async () => {
    let id = await SecureStore.getItemAsync(KEYS.DEVICE_ID);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await SecureStore.setItemAsync(KEYS.DEVICE_ID, id);
    }
    return id;
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER);
  },
};
