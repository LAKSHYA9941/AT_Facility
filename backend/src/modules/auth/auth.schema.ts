export const sendOtpSchema = {
  body: {
    type: "object",
    required: ["phone"],
    properties: {
      phone: { type: "string" },
      role: { type: "string" },
    },
  },
};

export const verifyOtpSchema = {
  body: {
    type: "object",
    required: ["phone", "otp", "deviceId"],
    properties: {
      phone: { type: "string" },
      otp: { type: "string", minLength: 6, maxLength: 6 },
      deviceId: { type: "string" },
      deviceName: { type: "string" },
      role: { type: "string" },
    },
  },
};

export const refreshSchema = {
  body: {
    type: "object",
    required: ["refreshToken", "deviceId"],
    properties: {
      refreshToken: { type: "string" },
      deviceId: { type: "string" },
    },
  },
};

export const completeProfileSchema = {
  body: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", minLength: 2 },
      email: { type: "string" },
    },
  },
};

export const logoutSchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string" },
    },
  },
};
