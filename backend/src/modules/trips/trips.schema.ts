export const estimateTripSchema = {
  body: {
    type: "object",
    required: ["waypoints", "passengerCount", "startDate", "endDate"],
    properties: {
      waypoints: {
        type: "array",
        items: {
          type: "object",
          required: ["lat", "lng"],
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
          },
        },
      },
      passengerCount: { type: "number", minimum: 1, maximum: 50 },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time" },
    },
  },
};

export const createTripSchema = {
  body: {
    type: "object",
    required: [
      "tripType",
      "waypoints",
      "startDate",
      "endDate",
      "passengerCount",
      "vehicleSegment",
      "totalFare",
      "selectedPercentage",
    ],
    properties: {
      tripType: { type: "string" },
      waypoints: {
        type: "array",
        items: {
          type: "object",
          required: ["address", "lat", "lng"],
          properties: {
            address: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
          },
        },
      },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time" },
      passengerCount: { type: "number", minimum: 1 },
      vehicleSegment: { type: "string" },
      totalFare: { type: "number" },
      selectedPercentage: { type: "number", enum: [25, 50, 100] },
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
