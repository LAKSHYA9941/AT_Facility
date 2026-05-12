import prisma from "../../shared/db/prisma";
import { LocationRedis } from "../../shared/redis/redis";
import { VehicleSegment } from "../../shared/types/enums";

// Haversine formula — straight line distance between two GPS points in km
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

// ETA estimate in minutes based on distance
const estimateETA = (distanceKm: number): number => {
  // Average city speed 20 km/h
  return Math.ceil((distanceKm / 20) * 60);
};

export type NearbyDriver = {
  driverId: string;
  userId: string;
  name: string | null;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
  };
  distanceKm: number;
  etaMinutes: number;
  lat: number;
  lng: number;
};

export const findNearestDrivers = async (
  pickupLat: number,
  pickupLng: number,
  segment: VehicleSegment,
  radiusKm: number = 5,
  limit: number = 5,
): Promise<NearbyDriver[]> => {
  // Get all online available verified drivers for this segment
  const drivers = await prisma.driverProfile.findMany({
    where: {
      isOnline: true,
      isAvailable: true,
      kycStatus: "VERIFIED",
      segment,
    },
    include: {
      user: true,
      vehicle: true,
    },
  });

  if (drivers.length === 0) return [];

  // Get live locations from Redis and calculate distances
  const driversWithDistance: NearbyDriver[] = [];

  for (const driver of drivers) {
    // Try Redis first for live location
    const liveLocation = await LocationRedis.get(driver.id);

    const lat = liveLocation?.lat ?? driver.currentLat;
    const lng = liveLocation?.lng ?? driver.currentLng;

    if (!lat || !lng) continue;

    const distanceKm = haversineKm(pickupLat, pickupLng, lat, lng);

    if (distanceKm > radiusKm) continue;
    if (!driver.vehicle) continue;

    driversWithDistance.push({
      driverId: driver.id,
      userId: driver.userId,
      name: driver.user.name,
      phone: driver.user.phone,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      vehicle: {
        make: driver.vehicle.make,
        model: driver.vehicle.model,
        color: driver.vehicle.color,
        plateNumber: driver.vehicle.plateNumber,
      },
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      etaMinutes: estimateETA(distanceKm),
      lat,
      lng,
    });
  }

  // Sort by distance — closest first
  return driversWithDistance
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
};

export const findSingleNearestDriver = async (
  pickupLat: number,
  pickupLng: number,
  segment: VehicleSegment,
): Promise<NearbyDriver | null> => {
  const drivers = await findNearestDrivers(pickupLat, pickupLng, segment, 5, 1);
  return drivers[0] ?? null;
};
