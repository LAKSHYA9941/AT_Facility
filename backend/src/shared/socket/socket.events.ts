export const SOCKET_EVENTS = {
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

  // Server → Admin
  ADMIN_STATS: "admin:stats:update",
  ADMIN_KYC: "admin:kyc:submitted",

  // General
  ERROR: "error",
  CONNECTED: "connected",
} as const;
