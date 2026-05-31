import { z } from "zod/v4";

export const sendOtpSchema = {
  body: z.object({
    phone: z.string(),
    role: z.string().optional(),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    phone: z.string(),
    otp: z.string().min(6).max(6),
    deviceId: z.string(),
    deviceName: z.string().optional(),
    role: z.string().optional(),
  }),
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string(),
    deviceId: z.string(),
  }),
};

export const completeProfileSchema = {
  body: z.object({
    name: z.string().min(2),
    email: z.string().optional(),
  }),
};

export const logoutSchema = {
  body: z.object({
    refreshToken: z.string(),
  }),
};
