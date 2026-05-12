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
  DRIVER_ACCEPT: "driver:ride:accept",
  DRIVER_DECLINE: "driver:ride:decline",
  DRIVER_ARRIVED: "driver:ride:arrived",
  DRIVER_STARTED: "driver:ride:started",
  DRIVER_COMPLETED: "driver:ride:completed",

  // Server → Driver
  RIDE_REQUEST: "ride:request",
  RIDE_CANCELLED: "ride:cancelled",

  // Server → Customer
  RIDE_SEARCHING: "ride:searching",
  RIDE_ASSIGNED: "ride:driver:assigned",
  RIDE_DRIVER_LOCATION: "ride:driver:location",
  RIDE_DRIVER_ARRIVED: "ride:driver:arrived",
  RIDE_STARTED: "ride:started",
  RIDE_COMPLETED: "ride:completed",
  RIDE_NO_DRIVERS: "ride:no:drivers",

  CONNECTED: "connected",
  ERROR: "error",
} as const;
