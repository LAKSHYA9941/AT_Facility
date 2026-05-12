import axios from "axios";

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

let mapplsToken: string | null = null;
let tokenExpiry: number = 0;

const getMapplsToken = async (): Promise<string> => {
  if (mapplsToken && Date.now() < tokenExpiry) return mapplsToken;
  try {
    const res = await axios.post(
      "https://outpost.mappls.com/api/security/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.MAPPLS_CLIENT_ID!,
        client_secret: process.env.MAPPLS_CLIENT_SECRET!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    console.log("✅ Mappls token received");
    mapplsToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return mapplsToken!;
  } catch (err: any) {
    console.error("❌ Mappls token error:", err.response?.data || err.message);
    throw err;
  }
};

export type RouteInfo = {
  distanceKm: number;
  durationMin: number;
  polyline: string;
};

export const getRouteInfo = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<RouteInfo> => {
  if (process.env.MAPPLS_CLIENT_ID && process.env.MAPPLS_CLIENT_SECRET) {
    try {
      const token = await getMapplsToken();

      // Mappls expects lng,lat format (GeoJSON order)
      // coordinates: {lng},{lat};{lng},{lat}
      const coordinates = `${originLng},${originLat};${destLng},${destLat}`;

      const res = await axios.get(
        `https://apis.mappls.com/advancedmaps/v1/${process.env.MAPPLS_REST_API_KEY}/route_adv/driving/${coordinates}`,
        {
          params: {
            region: "ind",
            overview: "full",
            steps: false,
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );

      const route = res.data.routes?.[0];
      if (route) {
        console.log(
          "✅ Mappls route:",
          route.distance,
          "m,",
          route.duration,
          "s",
        );
        return {
          distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
          durationMin: Math.ceil(route.duration / 60),
          polyline: route.geometry || "",
        };
      }
    } catch (err: any) {
      console.warn(
        "⚠️ Mappls route failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  }

  // Fallback — haversine × 1.3 road factor
  const straight = haversineKm(originLat, originLng, destLat, destLng);
  const road = parseFloat((straight * 1.3).toFixed(2));
  return {
    distanceKm: road,
    durationMin: Math.ceil((road / 20) * 60),
    polyline: "",
  };
};
