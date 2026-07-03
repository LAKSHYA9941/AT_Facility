import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation2,
  Users,
} from "lucide-react-native";
import LocationAutocomplete from "../../../components/LocationAutocomplete";
import { useCurrentLocation } from "../../../hooks/useCurrentLocation";
import {
  getDistanceBetweenPoints,
  GeoapifyPlace,
} from "../../../utils/geoapify";
import { api } from "../../../utils/api";

export default function PlanTripScreen(): React.JSX.Element {
  const router = useRouter();
  const locationState = useCurrentLocation();

  const [loading, setLoading] = useState<boolean>(false);

  // Trip Type
  const [tripType, setTripType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");

  // Locations
  const [pickupPlace, setPickupPlace] = useState<GeoapifyPlace | null>(null);
  const [destinationPlaces, setDestinationPlaces] = useState<
    Array<GeoapifyPlace | null>
  >([null]);

  // Dates & Times
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(
    new Date(Date.now() + 5 * 86400000),
  );

  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Travellers
  const [passengerCount, setPassengerCount] = useState<number>(2);

  // Form Validity
  const isValid = useMemo(() => {
    return (
      pickupPlace !== null &&
      destinationPlaces.length > 0 &&
      destinationPlaces.every((d) => d !== null) &&
      passengerCount >= 1
    );
  }, [pickupPlace, destinationPlaces, passengerCount]);

  // Stop management
  const handleAddStop = useCallback((): void => {
    if (destinationPlaces.length < 4) {
      setDestinationPlaces((prev) => [...prev, null]);
    }
  }, [destinationPlaces]);

  const handleRemoveStop = useCallback((index: number): void => {
    setDestinationPlaces((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Date handlers
  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date): void => {
      setShowStartPicker(false);
      if (date) {
        const newDate = new Date(date);
        newDate.setHours(startDate.getHours(), startDate.getMinutes());
        setStartDate(newDate);
      }
    },
    [startDate],
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date): void => {
      setShowTimePicker(false);
      if (date) {
        const newDate = new Date(startDate);
        newDate.setHours(date.getHours(), date.getMinutes());
        setStartDate(newDate);
      }
    },
    [startDate],
  );

  const handleEndDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date): void => {
      setShowEndPicker(false);
      if (date) {
        const newDate = new Date(date);
        newDate.setHours(endDate.getHours(), endDate.getMinutes());
        setEndDate(newDate);
      }
    },
    [endDate],
  );

  // Find Cabs Submission
  const handleFindCabs = useCallback(async (): Promise<void> => {
    if (!pickupPlace) return;

    setLoading(true);
    try {
      const waypoints = [
        {
          lat: pickupPlace.lat,
          lng: pickupPlace.lon,
          address: pickupPlace.label,
        },
        ...destinationPlaces.map((d) => ({
          lat: d!.lat,
          lng: d!.lon,
          address: d!.label,
        })),
      ];

      // 1. Fetch distance
      let calculatedKm = 250;

      try {
        const routeResult = await getDistanceBetweenPoints(waypoints);
        calculatedKm = routeResult.distanceKm;
      } catch (err: any) {
        // Fallback distance calculation
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            "Distance calculation failed",
            "We could not accurately route this trip. We will use an estimated distance.",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => reject(new Error("User cancelled")),
              },
              {
                text: "Continue",
                onPress: () => {
                  calculatedKm = 250;
                  resolve();
                },
              },
            ],
          );
        });
      }

      // 2. Fetch estimation from backend
      const response = await api.post("/api/trips/estimate", {
        tripType,
        pickupAddress: pickupPlace.label,
        destinations: destinationPlaces.map((d) => d!.label),
        distanceKm: calculatedKm,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        passengerCount,
      });

      const fareEstimates = response.data.data;

      // 3. Navigate to Fleet Selection
      router.push({
        pathname: "/(customer)/fleet-selection",
        params: {
          tripType,
          waypoints: JSON.stringify(waypoints),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          passengerCount: passengerCount.toString(),
          fareEstimates: JSON.stringify(fareEstimates),
        },
      });
    } catch (e: any) {
      if (e.message !== "User cancelled") {
        Alert.alert(
          "Error",
          e.response?.data?.message || e.message || "Failed to fetch estimates",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    pickupPlace,
    destinationPlaces,
    tripType,
    startDate,
    endDate,
    passengerCount,
    router,
  ]);

  // Date formatters
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-[#1B4F8A] text-xl font-bold text-center mb-6">
          Plan Trip
        </Text>

        {/* Trip Type Toggle */}
        <View className="flex-row bg-[#F3F4F6] rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setTripType("ONE_WAY")}
            className={`flex-1 py-3 items-center rounded-lg ${
              tripType === "ONE_WAY" ? "bg-white" : ""
            }`}
          >
            <Text
              className={`font-bold text-sm ${tripType === "ONE_WAY" ? "text-[#1B4F8A]" : "text-gray-500"}`}
            >
              One-Way
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTripType("ROUND_TRIP")}
            className={`flex-1 py-3 items-center rounded-lg ${
              tripType === "ROUND_TRIP" ? "bg-white" : ""
            }`}
          >
            <Text
              className={`font-bold text-sm ${tripType === "ROUND_TRIP" ? "text-[#1B4F8A]" : "text-gray-500"}`}
            >
              Round-Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Locations Card */}
        <View className="bg-white border border-[#E5E7EB] rounded-2xl p-4 mb-6 shadow-sm">
          <View className="flex-row mb-4">
            <View className="mt-7 mr-3">
              <Navigation2 size={18} color="#10B981" />
            </View>
            <View className="flex-1">
              <LocationAutocomplete
                label=""
                placeholder="Pickup Location"
                value={pickupPlace}
                onSelect={setPickupPlace}
                onClear={() => setPickupPlace(null)}
                biasCoords={locationState.coords}
                showCurrentLocationButton={true}
                currentLocationState={locationState}
              />
            </View>
          </View>

          <View className="h-px bg-gray-100 ml-8 mb-4" />

          {destinationPlaces.map((dest, i) => (
            <View key={i} className="flex-row mb-4">
              <View className="mt-7 mr-3 relative">
                <MapPin size={18} color="#EF4444" />
                {/* Visual dotted line connecting pins could go here */}
              </View>
              <View className="flex-1">
                <LocationAutocomplete
                  label=""
                  placeholder={
                    i === 0 ? "Final Drop Location" : `Stop ${i + 1}`
                  }
                  value={dest}
                  onSelect={(place) => {
                    const next = [...destinationPlaces];
                    next[i] = place;
                    setDestinationPlaces(next);
                  }}
                  onClear={() => {
                    const next = [...destinationPlaces];
                    next[i] = null;
                    setDestinationPlaces(next);
                  }}
                  biasCoords={
                    pickupPlace
                      ? { lat: pickupPlace.lat, lon: pickupPlace.lon }
                      : locationState.coords
                  }
                />
                {destinationPlaces.length > 1 && (
                  <View className="items-end -mt-3 pr-1">
                    <TouchableOpacity
                      onPress={() => handleRemoveStop(i)}
                      className="bg-red-50 px-3 py-1.5 rounded-md"
                    >
                      <Text className="text-red-500 font-bold text-xs">
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}

          {destinationPlaces.length < 4 && (
            <TouchableOpacity
              onPress={handleAddStop}
              className="flex-row items-center ml-1 mt-2"
            >
              <Text className="text-[#1B4F8A] font-bold text-base mr-2">+</Text>
              <Text className="text-[#1B4F8A] font-bold text-sm">Add Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date / Time Row */}
        <View className="flex-row justify-between gap-2 mb-6">
          <View className="flex-1 items-center">
            <Text className="text-[10px] text-gray-400 font-bold mb-2 uppercase">
              Start
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="w-full flex-row items-center justify-center border border-[#E5E7EB] bg-white rounded-xl py-3 px-2"
            >
              <View className="mr-1.5">
                <Calendar size={14} color="#6B7280" />
              </View>
              <Text className="text-[#111827] font-semibold text-xs">
                {formatDate(startDate)}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center">
            <Text className="text-[10px] text-gray-400 font-bold mb-2 uppercase">
              Pickup Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="w-full flex-row items-center justify-center border border-[#E5E7EB] bg-white rounded-xl py-3 px-2"
            >
              <View className="mr-1.5">
                <Clock size={14} color="#6B7280" />
              </View>
              <Text className="text-[#111827] font-semibold text-xs">
                {formatTime(startDate)}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center">
            <Text className="text-[10px] text-gray-400 font-bold mb-2 uppercase">
              End
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTripType("ROUND_TRIP");
                setShowEndPicker(true);
              }}
              className={`w-full flex-row items-center justify-center border border-[#E5E7EB] rounded-xl py-3 px-2 ${
                tripType === "ONE_WAY" ? "bg-gray-100 opacity-60" : "bg-white"
              }`}
            >
              <View className="mr-1.5">
                <Calendar size={14} color="#6B7280" />
              </View>
              <Text className="text-[#111827] font-semibold text-xs">
                {formatDate(endDate)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            onChange={handleTimeChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={handleEndDateChange}
          />
        )}

        {/* Travellers Card */}
        <View className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex-row items-center justify-between mb-8 shadow-sm">
          <View className="flex-row items-center">
            <View className="mr-3">
              <Users size={20} color="#6B7280" />
            </View>
            <Text className="font-bold text-gray-800 text-base">
              Travellers
            </Text>
          </View>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
              className="bg-gray-100 w-8 h-8 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600 font-bold text-lg">-</Text>
            </TouchableOpacity>
            <Text className="font-bold text-[#111827] text-lg w-4 text-center">
              {passengerCount}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setPassengerCount(Math.min(10, passengerCount + 1))
              }
              className="bg-gray-100 w-8 h-8 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600 font-bold text-lg">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleFindCabs}
          disabled={!isValid || loading}
          className={`py-4 rounded-2xl items-center justify-center flex-row ${
            isValid && !loading ? "bg-[#1B4F8A]" : "bg-[#D1D5DB]"
          }`}
        >
          {loading ? (
            <View className="mr-2">
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          ) : null}
          <Text className="text-white font-bold text-lg">
            {loading ? "Searching..." : "Find Cabs"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
