import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in environment variables");
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

// OTP helpers — stored in Redis with TTL
export const OTPRedis = {
  set: async (phone: string, otp: string, ttlSeconds = 300) => {
    await redis.setex(`otp:${phone}`, ttlSeconds, otp);
  },

  get: async (phone: string): Promise<string | null> => {
    return redis.get(`otp:${phone}`);
  },

  delete: async (phone: string) => {
    await redis.del(`otp:${phone}`);
  },

  incrementAttempts: async (phone: string): Promise<number> => {
    const key = `otp:attempts:${phone}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, 600); // reset after 10 min
    return attempts;
  },

  getAttempts: async (phone: string): Promise<number> => {
    const val = await redis.get(`otp:attempts:${phone}`);
    return val ? parseInt(val) : 0;
  },

  clearAttempts: async (phone: string) => {
    await redis.del(`otp:attempts:${phone}`);
  },
};

// Driver location cache
export const LocationRedis = {
  set: async (driverId: string, lat: number, lng: number) => {
    await redis.setex(
      `location:${driverId}`,
      30, // expire after 30s if driver stops sending
      JSON.stringify({ lat, lng, updatedAt: Date.now() }),
    );
  },

  get: async (driverId: string) => {
    const val = await redis.get(`location:${driverId}`);
    return val ? JSON.parse(val) : null;
  },

  delete: async (driverId: string) => {
    await redis.del(`location:${driverId}`);
  },
};
