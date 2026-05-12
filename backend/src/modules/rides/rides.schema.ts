export const estimateSchema = {
  body: {
    type: "object",
    required: ["pickupLat", "pickupLng", "dropLat", "dropLng", "segment"],
    properties: {
      pickupLat: { type: "number" },
      pickupLng: { type: "number" },
      dropLat: { type: "number" },
      dropLng: { type: "number" },
      segment: { type: "string" },
      passengerCount: { type: "number", minimum: 1, maximum: 10 },
    },
  },
};

export const createRideSchema = {
  body: {
    type: "object",
    required: [
      "pickupAddress",
      "pickupLat",
      "pickupLng",
      "dropAddress",
      "dropLat",
      "dropLng",
      "segment",
    ],
    properties: {
      pickupAddress: { type: "string" },
      pickupLat: { type: "number" },
      pickupLng: { type: "number" },
      dropAddress: { type: "string" },
      dropLat: { type: "number" },
      dropLng: { type: "number" },
      segment: { type: "string" },
      passengerCount: { type: "number", minimum: 1 },
      paymentMethod: { type: "string" },
    },
  },
};

export const startRideSchema = {
  body: {
    type: "object",
    required: ["otp"],
    properties: {
      otp: { type: "string", minLength: 6, maxLength: 6 },
    },
  },
};

export const cancelRideSchema = {
  body: {
    type: "object",
    properties: {
      reason: { type: "string" },
    },
  },
};
