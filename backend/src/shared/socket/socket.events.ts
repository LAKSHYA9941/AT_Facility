export const SOCKET_EVENTS = {
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

  // Server → Admin
  ADMIN_STATS: "admin:stats:update",
  ADMIN_KYC: "admin:kyc:submitted",

  // General
  ERROR: "error",
  CONNECTED: "connected",
} as const;
