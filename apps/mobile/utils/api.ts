import axios from "axios";
import { SecureStorage } from "./secureStorage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.147:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// silent token refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      const deviceId = await SecureStorage.getDeviceId();

      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken,
        deviceId,
      });

      const { accessToken, refreshToken: newRefresh } = data.data;
      await SecureStorage.setTokens(accessToken, newRefresh);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await SecureStorage.clear();
      // auth store will handle redirect
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
