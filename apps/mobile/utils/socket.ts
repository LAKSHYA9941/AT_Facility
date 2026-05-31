import { io, Socket } from "socket.io-client";
import { SecureStorage } from "./secureStorage";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.147:3000";

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await SecureStorage.getAccessToken();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket error:", err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const EVENTS = {
  // Driver → Server
  DRIVER_ONLINE: "driver:online",
  DRIVER_OFFLINE: "driver:offline",
  DRIVER_LOCATION: "driver:location",
  // ── Trip Events ──────────────────────────────────────────
  TRIP_OPEN: "trip:open",
  TRIP_ACCEPTED: "trip:accepted",
  TRIP_ENROUTE: "trip:driver_enroute",
  TRIP_STARTED: "trip:started",
  TRIP_COMPLETED: "trip:completed",
  TRIP_CANCELLED: "trip:cancelled",
  TRIP_REASSIGNING: "trip:reassigning",

  // ── New Trip Job Board Events (Phase 5) ──────────────────
  TRIP_JOB_AVAILABLE: "trip:job_available",
  DRIVER_ACCEPT_JOB: "driver:accept_job",
  TRIP_JOB_ACCEPTED: "trip:job_accepted",
  TRIP_STATUS_UPDATED: "trip:status_updated",
  DRIVER_ASSIGNED: "trip:driver_assigned",
  TRIP_JOB_TAKEN: "trip:job_taken",

  // ── Admin Events ──────────────────────────────────────────
  ADMIN_STATS_UPDATE: "admin:stats:update",
  ADMIN_KYC_SUBMITTED: "admin:kyc:submitted",
  ADMIN_DRIVER_LOCATION: "admin:driver:location",

  CONNECTED: "connected",
  ERROR: "error",
} as const;
