/**
 * geoapify.ts
 *
 * All Geoapify API calls are proxied through the AT Facility backend.
 * The Geoapify API key lives ONLY on the server — never in the mobile app.
 */

import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoapifyPlace = {
  placeId: string;
  label: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
};

export type DistanceResult = {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
};

// ─── Autocomplete ─────────────────────────────────────────────────────────────

export async function searchPlaces(
  query: string,
  biaslat?: number,
  biaslon?: number,
): Promise<GeoapifyPlace[]> {
  if (query.trim().length < 2) {
    return [];
  }

  try {
    const params: Record<string, string> = { q: query };
    if (biaslat !== undefined && biaslon !== undefined) {
      params.lat = String(biaslat);
      params.lon = String(biaslon);
    }

    const response = await api.get("/api/geo/autocomplete", { params });
    return (response.data?.data ?? []) as GeoapifyPlace[];
  } catch (error: any) {
    if (__DEV__) {
      console.warn(
        "searchPlaces failed:",
        error?.response?.data ?? error?.message,
      );
    }
    return [];
  }
}

// ─── Route Distance ───────────────────────────────────────────────────────────

export async function getDistanceBetweenPoints(
  waypoints: Array<{
    lat: number;
    lon?: number;
    lng?: number;
    address?: string;
  }>,
): Promise<DistanceResult> {
  if (waypoints.length < 2) {
    throw new Error("Minimum 2 waypoints are required to calculate distance.");
  }

  const response = await api.post("/api/geo/routing", { waypoints });
  const data = response.data?.data;

  if (!data) {
    throw new Error("Unable to calculate distance. Please try again.");
  }

  return data as DistanceResult;
}

// ─── Reverse Geocode ──────────────────────────────────────────────────────────

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<GeoapifyPlace | null> {
  try {
    const response = await api.get("/api/geo/reverse", {
      params: { lat: String(lat), lon: String(lon) },
    });
    return (response.data?.data ?? null) as GeoapifyPlace | null;
  } catch (error: any) {
    if (__DEV__) {
      console.warn(
        "reverseGeocode failed:",
        error?.response?.data ?? error?.message,
      );
    }
    return null;
  }
}
