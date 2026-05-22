import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Users,
  Zap,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../utils/api";
import axios from "axios";
import {
  useMockStore,
  MOCK_WAYPOINTS,
  MOCK_FARE_ESTIMATES,
} from "../../store/mock";

// Suggestions that are always shown when Mock Mode is active
const MOCK_SUGGESTIONS = MOCK_WAYPOINTS.map((wp, i) => ({
  place_id: `mock-place-${i}`,
  description: wp.address,
  lat: wp.lat,
  lng: wp.lng,
}));

type Waypoint = { address: string; lat: number; lng: number };

export default function PlanTripScreen() {
  const { isMockMode, toggleMockMode } = useMockStore();

  const [tripType, setTripType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { address: "", lat: 0, lng: 0 }, // Pickup
    { address: "", lat: 0, lng: 0 }, // Drop
  ]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 5 * 86400000)); // +5 days default
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [passengerCount, setPassengerCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchTimeoutRef = useRef<any>(null);

  // When the search modal opens in mock mode, immediately surface the 3 test locations
  useEffect(() => {
    if (editingIndex !== null && isMockMode) {
      setSearchResults(MOCK_SUGGESTIONS);
    }
    if (editingIndex === null) {
      setSearchResults([]);
      setSearchQuery("");
    }
  }, [editingIndex, isMockMode]);

  const handleAddStop = () => {
    if (waypoints.length < 5) {
      const newWaypoints = [...waypoints];
      newWaypoints.splice(newWaypoints.length - 1, 0, {
        address: "",
        lat: 0,
        lng: 0,
      });
      setWaypoints(newWaypoints);
    }
  };

  const handleRemoveStop = (index: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);
    setWaypoints(newWaypoints);
  };

  const searchAddress = async (query: string) => {
    setSearchQuery(query);

    // ── MOCK MODE: always show the 3 test locations, no API needed ──
    if (isMockMode) {
      setSearchResults(MOCK_SUGGESTIONS);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
          if (!apiKey) {
            throw new Error("Google Maps API key is not configured.");
          }
          const res = await axios.post(
            "https://places.googleapis.com/v1/places:autocomplete",
            { input: query },
            {
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
              },
            },
          );
          if (res.data && res.data.suggestions) {
            const mapped = res.data.suggestions
              .map((s: any) => ({
                place_id:
                  s.placePrediction?.placeId ||
                  s.placePrediction?.place?.replace("places/", ""),
                description: s.placePrediction?.text?.text || "",
              }))
              .filter((item: any) => item.place_id && item.description);
            setSearchResults(mapped);
          } else {
            setSearchResults([]);
          }
        } catch (e: any) {
          console.warn(
            "Google Places failed, falling back to OSM:",
            e?.response?.data || e.message || e,
          );
          try {
            const osmRes = await axios.get(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
              {
                headers: {
                  "User-Agent":
                    "AtFacilityMobileTestingApp/1.0.0 (contact: support@atfacility.com)",
                },
              },
            );
            const mapped = (osmRes.data || []).map((item: any) => ({
              place_id: `osm-${item.place_id}`,
              description: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }));
            setSearchResults(mapped);
          } catch (osmErr) {
            console.error("OSM Nominatim error:", osmErr);
            setSearchResults([]);
          }
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  const selectAddress = async (item: any) => {
    if (editingIndex !== null) {
      // Mock suggestions carry lat/lng directly — handle same as OSM
      if (
        item.place_id &&
        (item.place_id.toString().startsWith("osm-") ||
          item.place_id.toString().startsWith("mock-place-"))
      ) {
        const newWaypoints = [...waypoints];
        newWaypoints[editingIndex] = {
          address: item.description,
          lat: item.lat,
          lng: item.lng,
        };
        if (tripType === "ROUND_TRIP" && editingIndex === 0) {
          newWaypoints[newWaypoints.length - 1] = {
            ...newWaypoints[editingIndex],
          };
        }
        setWaypoints(newWaypoints);
        setEditingIndex(null);
        setSearchQuery("");
        setSearchResults([]);
        return;
      }

      try {
        setFetchingDetails(true);
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
        const res = await axios.get(
          `https://places.googleapis.com/v1/places/${item.place_id}`,
          {
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "id,location",
            },
          },
        );

        if (res.data && res.data.location) {
          const { latitude, longitude } = res.data.location;
          const newWaypoints = [...waypoints];
          newWaypoints[editingIndex] = {
            address: item.description,
            lat: latitude,
            lng: longitude,
          };
          if (tripType === "ROUND_TRIP" && editingIndex === 0) {
            newWaypoints[newWaypoints.length - 1] = {
              ...newWaypoints[editingIndex],
            };
          }
          setWaypoints(newWaypoints);
        } else {
          Alert.alert(
            "Location Error",
            "Could not fetch details for the selected location.",
          );
        }
      } catch (e: any) {
        console.error("Google Place Details error:", e?.response?.data || e);
        Alert.alert("Network Error", "Failed to retrieve location details.");
      } finally {
        setFetchingDetails(false);
      }
    }
    setEditingIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleFindCabs = async () => {
    // ─── MOCK MODE: bypass API, use hardcoded Delhi→Haridwar→Rishikesh route ───
    if (isMockMode) {
      const mockStart = new Date();
      const mockEnd = new Date(Date.now() + 5 * 86400000);
      router.push({
        pathname: "/(customer)/fleet-selection",
        params: {
          tripType: "ONE_WAY",
          waypoints: JSON.stringify(MOCK_WAYPOINTS),
          startDate: mockStart.toISOString(),
          endDate: mockEnd.toISOString(),
          passengerCount: "2",
          fareEstimates: JSON.stringify(MOCK_FARE_ESTIMATES),
        },
      });
      return;
    }

    // ─── REAL MODE ───
    if (!waypoints[0].address || !waypoints[waypoints.length - 1].address) {
      return Alert.alert(
        "Missing Fields",
        "Please enter pickup and drop locations",
      );
    }
    if (endDate < startDate) {
      return Alert.alert("Invalid Dates", "End date must be after start date");
    }

    try {
      setLoading(true);
      const res = await api.post("/api/trips/estimate", {
        waypoints,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        passengerCount,
      });

      router.push({
        pathname: "/(customer)/fleet-selection",
        params: {
          tripType,
          waypoints: JSON.stringify(waypoints),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          passengerCount: passengerCount.toString(),
          fareEstimates: JSON.stringify(res.data.data),
        },
      });
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Failed to estimate fare",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <TopBar title="Plan Trip" />

      {/* ── Mock Mode Banner ── */}
      <TouchableOpacity
        onPress={toggleMockMode}
        activeOpacity={0.85}
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 4,
          borderRadius: 12,
          backgroundColor: isMockMode ? "#F59E0B" : "#F3F4F6",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1.5,
          borderColor: isMockMode ? "#D97706" : "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Zap
            size={16}
            color={isMockMode ? "#fff" : "#9CA3AF"}
            fill={isMockMode ? "#fff" : "none"}
          />
          <View>
            <Text
              style={{
                fontWeight: "700",
                fontSize: 13,
                color: isMockMode ? "#fff" : "#6B7280",
              }}
            >
              {isMockMode ? "🟡 MOCK MODE ON" : "Mock Mode"}
            </Text>
            {isMockMode && (
              <Text style={{ fontSize: 11, color: "#FEF3C7", marginTop: 1 }}>
                Delhi → Haridwar → Rishikesh (5 days)
              </Text>
            )}
          </View>
        </View>
        {/* Toggle pill */}
        <View
          style={{
            width: 42,
            height: 24,
            borderRadius: 12,
            backgroundColor: isMockMode ? "#D97706" : "#D1D5DB",
            justifyContent: "center",
            padding: 2,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#fff",
              marginLeft: isMockMode ? 18 : 0,
            }}
          />
        </View>
      </TouchableOpacity>

      <ScrollView className="flex-1 px-5 pt-4">
        {/* Trip Type Toggle */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          <TouchableOpacity
            className={`flex-1 py-3 items-center rounded-lg ${tripType === "ONE_WAY" ? "bg-white shadow-sm" : ""}`}
            onPress={() => setTripType("ONE_WAY")}
          >
            <Text
              className={`font-semibold ${tripType === "ONE_WAY" ? "text-brand-primary" : "text-gray-500"}`}
            >
              One-Way
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 items-center rounded-lg ${tripType === "ROUND_TRIP" ? "bg-white shadow-sm" : ""}`}
            onPress={() => {
              setTripType("ROUND_TRIP");
              const newWp = [...waypoints];
              newWp[newWp.length - 1] = { ...newWp[0] };
              setWaypoints(newWp);
            }}
          >
            <Text
              className={`font-semibold ${tripType === "ROUND_TRIP" ? "text-brand-primary" : "text-gray-500"}`}
            >
              Round-Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Waypoints */}
        <View className="mb-6 border border-gray-200 rounded-2xl p-4">
          {waypoints.map((wp, index) => {
            const isPickup = index === 0;
            const isDrop = index === waypoints.length - 1;
            const isRoundTripDrop = tripType === "ROUND_TRIP" && isDrop;

            return (
              <View key={index} className="flex-row items-center mb-4">
                <MapPin
                  size={20}
                  color={isPickup ? "#22c55e" : isDrop ? "#ef4444" : "#f59e0b"}
                />
                <TouchableOpacity
                  className={`flex-1 ml-3 border-b border-gray-200 pb-2 ${isRoundTripDrop ? "opacity-50" : ""}`}
                  onPress={() => !isRoundTripDrop && setEditingIndex(index)}
                  disabled={isRoundTripDrop}
                >
                  <Text
                    className={wp.address ? "text-gray-900" : "text-gray-400"}
                  >
                    {wp.address ||
                      (isPickup
                        ? "Pickup Location"
                        : isDrop
                          ? "Final Drop Location"
                          : `Stop ${index}`)}
                  </Text>
                </TouchableOpacity>
                {!isPickup && !isDrop && (
                  <TouchableOpacity
                    onPress={() => handleRemoveStop(index)}
                    className="ml-2"
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {waypoints.length < 5 && (
            <TouchableOpacity
              onPress={handleAddStop}
              className="flex-row items-center mt-2"
            >
              <Plus size={20} color="#1B4F8A" />
              <Text className="text-brand-primary font-semibold ml-2">
                Add Stop
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inline Address Search Modal */}
        {editingIndex !== null && (
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-white z-50 p-5">
            <View className="flex-row items-center mb-4">
              <TouchableOpacity onPress={() => setEditingIndex(null)}>
                <Text className="text-brand-primary text-lg">Back</Text>
              </TouchableOpacity>
              <TextInput
                autoFocus
                className="flex-1 ml-4 bg-gray-100 p-3 rounded-xl"
                placeholder="Search location..."
                value={searchQuery}
                onChangeText={searchAddress}
              />
            </View>
            <ScrollView>
              {searchResults.length > 0 &&
                (isMockMode ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FEF3C7",
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#92400E",
                        fontWeight: "700",
                      }}
                    >
                      ⚡ Testing Locations — Tap to select
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-gray-400 text-center mb-2">
                    {searchResults[0].place_id.toString().startsWith("osm-")
                      ? "Suggestions powered by OpenStreetMap"
                      : "Suggestions powered by Google Places"}
                  </Text>
                ))}
              {fetchingDetails ? (
                <ActivityIndicator
                  size="large"
                  color="#1B4F8A"
                  className="mt-10"
                />
              ) : (
                searchResults.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => selectAddress(item)}
                    style={[
                      {
                        padding: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F4F6",
                        flexDirection: "row",
                        alignItems: "center",
                      },
                      isMockMode &&
                        item.place_id.toString().startsWith("mock-place-") && {
                          backgroundColor: "#FFFBEB",
                        },
                    ]}
                  >
                    <MapPin
                      size={15}
                      color={
                        i === 0
                          ? "#22c55e" // pickup green
                          : i === searchResults.length - 1
                            ? "#ef4444" // drop red
                            : "#f59e0b" // stop amber
                      }
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontWeight: isMockMode ? "600" : "400",
                          color: "#111827",
                          fontSize: 14,
                        }}
                      >
                        {item.description.split(",")[0]}
                      </Text>
                      {isMockMode && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            marginTop: 1,
                          }}
                        >
                          {item.description
                            .split(",")
                            .slice(1)
                            .join(",")
                            .trim()}
                        </Text>
                      )}
                    </View>
                    {isMockMode && (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#92400E",
                            fontWeight: "700",
                          }}
                        >
                          TEST
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Dates */}
        <View className="flex-row space-x-4 mb-6">
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-xl p-4 flex-row items-center"
            onPress={() => setShowStartPicker(true)}
          >
            <Calendar size={20} color="#6b7280" />
            <Text className="ml-3 font-semibold text-gray-700">
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-xl p-4 flex-row items-center"
            onPress={() => setShowEndPicker(true)}
          >
            <Calendar size={20} color="#6b7280" />
            <Text className="ml-3 font-semibold text-gray-700">
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) setStartDate(d);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(e, d) => {
              setShowEndPicker(false);
              if (d) setEndDate(d);
            }}
          />
        )}

        {/* Passengers */}
        <View className="border border-gray-200 rounded-xl p-4 flex-row items-center justify-between mb-8">
          <View className="flex-row items-center">
            <Users size={20} color="#6b7280" />
            <Text className="ml-3 font-semibold text-gray-700">Travellers</Text>
          </View>
          <View className="flex-row items-center space-x-4">
            <TouchableOpacity
              onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
              className="bg-gray-100 w-8 h-8 rounded-full items-center justify-center"
            >
              <Text className="text-lg font-bold text-gray-600">-</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold w-6 text-center">
              {passengerCount}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setPassengerCount(Math.min(12, passengerCount + 1))
              }
              className="bg-gray-100 w-8 h-8 rounded-full items-center justify-center"
            >
              <Text className="text-lg font-bold text-gray-600">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          disabled={
            loading ||
            (!isMockMode &&
              (!waypoints[0].address ||
                !waypoints[waypoints.length - 1].address))
          }
          onPress={handleFindCabs}
          className={`py-4 rounded-xl items-center mb-10 ${
            loading
              ? "bg-gray-300"
              : isMockMode
                ? "bg-amber-500"
                : !waypoints[0].address
                  ? "bg-gray-300"
                  : "bg-brand-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {isMockMode ? "⚡ Find Cabs (Mock)" : "Find Cabs"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
