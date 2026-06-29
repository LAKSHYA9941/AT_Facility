import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { reverseGeocode, GeoapifyPlace } from "../utils/geoapify";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

export function useCurrentLocation(): {
  coords: { lat: number; lon: number } | null;
  address: GeoapifyPlace | null;
  status: LocationStatus;
  errorMessage: string | null;
  request: () => Promise<void>;
} {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [address, setAddress] = useState<GeoapifyPlace | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLocationData = useCallback(async (): Promise<void> => {
    setStatus("requesting");
    setErrorMessage(null);

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      setCoords({ lat, lon });
      setStatus("granted");

      // Resolve geocode in background without blocking the UI status transition
      reverseGeocode(lat, lon).then((result) => {
        if (result) {
          setAddress(result);
        }
      });
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "";
      const code = err?.code;

      if (code === 1 || msg.toLowerCase().includes("denied")) {
        setErrorMessage("Location permission denied.");
      } else if (
        code === 2 ||
        msg.toLowerCase().includes("unavailable") ||
        msg.toLowerCase().includes("gps") ||
        msg.toLowerCase().includes("settings")
      ) {
        setErrorMessage("Location unavailable. Check GPS settings.");
      } else if (code === 3 || msg.toLowerCase().includes("timeout")) {
        setErrorMessage(
          "Location request timed out. Try again or type your city.",
        );
      } else {
        setErrorMessage("Could not get your location. Try again.");
      }
    }
  }, []);

  const request = useCallback(async (): Promise<void> => {
    // Removed emulator block so developers can use emulator mock locations

    try {
      const { status: reqStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (reqStatus !== "granted") {
        setStatus("denied");
        setErrorMessage(
          "Location access was denied. You can still type your pickup city manually.",
        );
        return;
      }
      await fetchLocationData();
    } catch (err: any) {
      setStatus("error");
      setErrorMessage("Could not request location permissions.");
    }
  }, [fetchLocationData]);

  // Check permissions on mount
  useEffect(() => {
    let active = true;

    async function checkPermission(): Promise<void> {
      try {
        const { status: currentStatus } =
          await Location.getForegroundPermissionsAsync();
        if (!active) return;

        if (currentStatus === "granted") {
          setStatus("granted");
          await fetchLocationData();
        } else if (currentStatus === "denied") {
          setStatus("denied");
        } else {
          setStatus("idle");
        }
      } catch (err) {
        if (active) {
          setStatus("error");
        }
      }
    }

    checkPermission();

    return () => {
      active = false;
    };
  }, [fetchLocationData]);

  return {
    coords,
    address,
    status,
    errorMessage,
    request,
  };
}
