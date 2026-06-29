import { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../../shared/utils/errors";

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;

function requireKey(): void {
  if (!GEOAPIFY_KEY) {
    throw new AppError("Geo service is not configured.", 503);
  }
}

async function fetchGeoapify(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new AppError(`Geoapify error: HTTP ${res.status}`, 502);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const geoController = {
  // GET /api/geo/autocomplete?q=...&lat=...&lon=...
  autocomplete: async (
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    requireKey();
    const { q, lat, lon } = req.query as {
      q?: string;
      lat?: string;
      lon?: string;
    };

    if (!q || q.trim().length < 2) {
      reply.code(200).send({ data: [] });
      return;
    }

    let url =
      `https://api.geoapify.com/v1/geocode/autocomplete` +
      `?text=${encodeURIComponent(q)}` +
      `&filter=countrycode:in&lang=en&limit=6` +
      `&apiKey=${GEOAPIFY_KEY}`;

    if (lat && lon) {
      url += `&bias=proximity:${lon},${lat}`;
    }

    const data = (await fetchGeoapify(url, 3000)) as any;
    const features = data?.features ?? [];

    const results = features.map((f: any, i: number) => {
      const p = f.properties ?? {};
      return {
        placeId: p.place_id ?? p.osm_id ?? String(i),
        label: p.formatted ?? "",
        city: p.city ?? p.county ?? p.state ?? "",
        state: p.state ?? "",
        country: p.country ?? "India",
        lat: p.lat,
        lon: p.lon,
      };
    });

    reply.code(200).send({ data: results });
  },

  // POST /api/geo/routing  body: { waypoints: [{lat, lon},...] }
  routing: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    requireKey();
    const { waypoints } = req.body as {
      waypoints: Array<{ lat: number; lon?: number; lng?: number }>;
    };

    if (!waypoints || waypoints.length < 2) {
      throw new AppError("At least 2 waypoints are required.", 400);
    }

    // Fetch each consecutive segment in parallel
    const segmentFetches = waypoints.slice(0, -1).map((origin, i) => {
      const dest = waypoints[i + 1];
      const originLon = origin.lng ?? origin.lon;
      const destLon = dest.lng ?? dest.lon;
      const url =
        `https://api.geoapify.com/v1/routing` +
        `?waypoints=${origin.lat},${originLon}|${dest.lat},${destLon}` +
        `&mode=drive&details=route_details` +
        `&apiKey=${GEOAPIFY_KEY}`;
      return fetchGeoapify(url, 10000);
    });

    const settled = await Promise.allSettled(segmentFetches);

    let totalMeters = 0;
    let totalSeconds = 0;
    let allFailed = true;

    settled.forEach((result) => {
      if (result.status === "fulfilled") {
        const data = result.value as any;
        const feature = data?.features?.[0];
        totalMeters += feature?.properties?.distance ?? 0;
        totalSeconds += feature?.properties?.time ?? 0;
        allFailed = false;
      }
    });

    if (allFailed) {
      throw new AppError(
        "Unable to calculate route. Please check waypoints and try again.",
        502,
      );
    }

    reply.code(200).send({
      data: {
        distanceMeters: Math.round(totalMeters),
        distanceKm: Math.round(totalMeters / 100) / 10,
        durationSeconds: Math.round(totalSeconds),
        durationMinutes: Math.round(totalSeconds / 60),
      },
    });
  },

  // GET /api/geo/reverse?lat=...&lon=...
  reverse: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    requireKey();
    const { lat, lon } = req.query as { lat?: string; lon?: string };

    if (!lat || !lon) {
      throw new AppError("lat and lon query params are required.", 400);
    }

    const url =
      `https://api.geoapify.com/v1/geocode/reverse` +
      `?lat=${lat}&lon=${lon}&lang=en&apiKey=${GEOAPIFY_KEY}`;

    const data = (await fetchGeoapify(url, 5000)) as any;
    const feature = data?.features?.[0];

    if (!feature) {
      reply.code(200).send({ data: null });
      return;
    }

    const p = feature.properties ?? {};
    reply.code(200).send({
      data: {
        placeId: p.place_id ?? p.osm_id ?? "reverse-0",
        label: p.formatted ?? "",
        city: p.city ?? p.county ?? p.state ?? "",
        state: p.state ?? "",
        country: p.country ?? "India",
        lat: p.lat,
        lon: p.lon,
      },
    });
  },
};
