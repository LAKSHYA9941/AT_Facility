export const estimateTripSchema = {
  body: {
    type: "object",
    required: [
      "pickupLat",
      "pickupLng",
      "dropLat",
      "dropLng",
      "passengerCount",
      "startDate",
      "endDate",
    ],
    properties: {
      pickupLat: { type: "number" },
      pickupLng: { type: "number" },
      dropLat: { type: "number" },
      dropLng: { type: "number" },
      passengerCount: { type: "number", minimum: 1, maximum: 50 },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time" },
      isRoundTrip: { type: "boolean" },
      preferredSegment: { type: "string" },
    },
  },
};

export const createTripSchema = {
  body: {
    type: "object",
    required: [
      "pickupAddress",
      "pickupLat",
      "pickupLng",
      "dropAddress",
      "dropLat",
      "dropLng",
      "passengerCount",
      "startDate",
      "endDate",
    ],
    properties: {
      pickupAddress: { type: "string" },
      pickupLat: { type: "number" },
      pickupLng: { type: "number" },
      dropAddress: { type: "string" },
      dropLat: { type: "number" },
      dropLng: { type: "number" },
      passengerCount: { type: "number", minimum: 1 },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time" },
      isRoundTrip: { type: "boolean" },
      preferredSegment: { type: "string" },
      waypoints: {
        type: "array",
        items: {
          type: "object",
          required: ["address", "lat", "lng", "order"],
          properties: {
            address: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
            order: { type: "number", minimum: 1 },
          },
        },
      },
    },
  },
};

export const cancelTripSchema = {
  body: {
    type: "object",
    properties: {
      reason: { type: "string" },
    },
  },
};
