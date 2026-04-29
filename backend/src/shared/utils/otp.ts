import crypto from "crypto";

export const generateOTP = (length = 6): string => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

export const generateRideOTP = (): string => {
  return generateOTP(6);
};
