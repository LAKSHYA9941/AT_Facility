import axios from "axios";
import { OTPRedis } from "../../shared/redis/redis";
import { generateOTP } from "../../shared/utils/otp";

const MAX_ATTEMPTS = 3;
const OTP_TTL = 300; // 5 minutes

export const sendOTP = async (phone: string): Promise<void> => {
  const otp = generateOTP(6);

  // store in Redis with TTL
  await OTPRedis.set(phone, otp, OTP_TTL);

  if (process.env.NODE_ENV === "development") {
    // in dev just log it — no SMS cost
    console.log(`\n🔐 OTP for ${phone}: ${otp}\n`);
    return;
  }

  // MSG91 SMS send in production
  await sendViaMSG91(phone, otp);
};

const sendViaMSG91 = async (phone: string, otp: string): Promise<void> => {
  try {
    await axios.post(
      "https://api.msg91.com/api/v5/otp",
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        authkey: process.env.MSG91_API_KEY,
        otp,
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("MSG91 send failed:", err);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

export const verifyOTP = async (
  phone: string,
  submittedOtp: string,
): Promise<{ valid: boolean; reason?: string }> => {
  // check attempt count
  const attempts = await OTPRedis.getAttempts(phone);
  if (attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: "Too many attempts. Request a new OTP." };
  }

  const storedOtp = await OTPRedis.get(phone);

  if (!storedOtp) {
    return { valid: false, reason: "OTP expired. Request a new one." };
  }

  if (storedOtp !== submittedOtp) {
    await OTPRedis.incrementAttempts(phone);
    const remaining = MAX_ATTEMPTS - attempts - 1;
    return {
      valid: false,
      reason: `Invalid OTP. ${remaining} attempts remaining.`,
    };
  }

  // valid — clean up
  await OTPRedis.delete(phone);
  await OTPRedis.clearAttempts(phone);

  return { valid: true };
};
