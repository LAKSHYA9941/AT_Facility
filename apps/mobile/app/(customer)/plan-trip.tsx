import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter } from "expo-router";
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  Zap,
  RefreshCw,
  Clock,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import TopBar from "../../components/layout/TopBar";
import {
  MOCK_FARE_ESTIMATES,
  MOCK_WAYPOINTS,
  useMockStore,
} from "../../store/mock";
import { api } from "../../utils/api";

// Suggestions that are always shown when Mock Mode is active
const MOCK_SUGGESTIONS = MOCK_WAYPOINTS.map((wp, i) => ({
  place_id: `mock-place-${i}`,
  description: wp.address,
  lat: wp.lat,
  lng: wp.lng,
}));

type Waypoint = { address: string; lat: number; lng: number };

export default function PlanTripScreen() {
  const router = useRouter();
  const { isMockMode, toggleMockMode } = useMockStore();
  const insets = useSafeAreaInsets();

  const [tripType, setTripType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { address: "", lat: 0, lng: 0 }, // Pickup
    { address: "", lat: 0, lng: 0 }, // Drop
  ]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 5 * 86400000)); // +5 days default
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
          tripType, // preserve user's ONE_WAY / ROUND_TRIP selection
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
    if (!waypoints[0].address) {
      return Alert.alert("Missing Fields", "Please enter a pickup location");
    }
    if (tripType === "ONE_WAY" && !waypoints[waypoints.length - 1].address) {
      return Alert.alert(
        "Missing Fields",
        "Please enter a drop location for one-way trips",
      );
    }

    const startDay = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const endDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );
    if (endDay < startDay) {
      return Alert.alert(
        "Invalid Dates",
        "End date must be on or after start date",
      );
    }

    try {
      setLoading(true);

      // Remove empty waypoints from the end (like an optional empty dropoff)
      const finalWaypoints = waypoints.filter((wp) => wp.address.trim() !== "");

      const res = await api.post("/api/trips/estimate", {
        tripType,
        waypoints: finalWaypoints,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        passengerCount,
      });

      router.push({
        pathname: "/(customer)/fleet-selection",
        params: {
          tripType,
          waypoints: JSON.stringify(finalWaypoints),
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
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
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
              {isMockMode ? "MOCK MODE ON" : "Mock Mode"}
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
      >
        {/* Trip Type Toggle */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor:
                tripType === "ONE_WAY" ? "#FFFFFF" : "transparent",
              shadowColor: tripType === "ONE_WAY" ? "#000" : undefined,
              shadowOffset:
                tripType === "ONE_WAY" ? { width: 0, height: 1 } : undefined,
              shadowOpacity: tripType === "ONE_WAY" ? 0.05 : 0,
              shadowRadius: tripType === "ONE_WAY" ? 2 : 0,
              elevation: tripType === "ONE_WAY" ? 1 : 0,
            }}
            onPress={() => {
              setTripType("ONE_WAY");
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: tripType === "ONE_WAY" ? "#1B4F8A" : "#6B7280",
              }}
            >
              One-Way
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor:
                tripType === "ROUND_TRIP" ? "#FFFFFF" : "transparent",
              shadowColor: tripType === "ROUND_TRIP" ? "#000" : undefined,
              shadowOffset:
                tripType === "ROUND_TRIP" ? { width: 0, height: 1 } : undefined,
              shadowOpacity: tripType === "ROUND_TRIP" ? 0.05 : 0,
              shadowRadius: tripType === "ROUND_TRIP" ? 2 : 0,
              elevation: tripType === "ROUND_TRIP" ? 1 : 0,
            }}
            onPress={() => {
              setTripType("ROUND_TRIP");
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: tripType === "ROUND_TRIP" ? "#1B4F8A" : "#6B7280",
              }}
            >
              Round-Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Waypoints */}
        <View
          style={{
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 16,
            padding: 16,
          }}
        >
          {waypoints.map((wp, index) => {
            const isPickup = index === 0;
            const isDrop = index === waypoints.length - 1;
            return (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <MapPin
                  size={20}
                  color={isPickup ? "#22c55e" : isDrop ? "#ef4444" : "#f59e0b"}
                />
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                    paddingBottom: 8,
                  }}
                  onPress={() => setEditingIndex(index)}
                >
                  <Text
                    style={{
                      color: wp.address ? "#111827" : "#9CA3AF",
                      fontSize: 14,
                    }}
                  >
                    {wp.address ||
                      (isPickup
                        ? "Pickup Location"
                        : isDrop
                          ? tripType === "ROUND_TRIP"
                            ? "Approx. return destination (optional)"
                            : "Final Drop Location"
                          : `Stop ${index}`)}
                  </Text>
                </TouchableOpacity>
                {!isPickup && !isDrop && (
                  <TouchableOpacity
                    onPress={() => handleRemoveStop(index)}
                    style={{ marginLeft: 8 }}
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Round-trip info banner */}
          {tripType === "ROUND_TRIP" && (
            <View
              style={{
                backgroundColor: "#EFF6FF",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginTop: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={14} color="#1D4ED8" />
              <Text
                style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "600" }}
              >
                Round-trip: driver returns you to the same pickup point
              </Text>
            </View>
          )}

          {waypoints.length < 5 && (
            <TouchableOpacity
              onPress={handleAddStop}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Plus size={20} color="#1B4F8A" />
              <Text
                style={{ color: "#1B4F8A", fontWeight: "600", marginLeft: 8 }}
              >
                Add Stop
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inline Address Search Modal */}
        {editingIndex !== null && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#FFFFFF",
              zIndex: 50,
              padding: 20,
              paddingTop: Math.max(20, insets.top + 10),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <TouchableOpacity onPress={() => setEditingIndex(null)}>
                <Text style={{ color: "#1B4F8A", fontSize: 18 }}>Back</Text>
              </TouchableOpacity>
              <TextInput
                autoFocus
                style={{
                  flex: 1,
                  marginLeft: 16,
                  backgroundColor: "#F3F4F6",
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 16,
                }}
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
                      Testing Locations — Tap to select
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {searchResults[0].place_id.toString().startsWith("osm-")
                      ? "Suggestions powered by OpenStreetMap"
                      : "Suggestions powered by Google Places"}
                  </Text>
                ))}
              {fetchingDetails ? (
                <ActivityIndicator
                  size="large"
                  color="#1B4F8A"
                  style={styles.loadingIndicator}
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
                    <View style={{ marginRight: 10 }}>
                      <MapPin
                        size={15}
                        color={
                          i === 0
                            ? "#22c55e" // pickup green
                            : i === searchResults.length - 1
                              ? "#ef4444" // drop red
                              : "#f59e0b" // stop amber
                        }
                      />
                    </View>
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
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: "row", marginBottom: 4, gap: 16 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  color: "#9CA3AF",
                  fontWeight: "600",
                  marginBottom: 3,
                }}
              >
                {tripType === "ROUND_TRIP" ? "DEPARTURE" : "START"}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  color: "#9CA3AF",
                  fontWeight: "600",
                  marginBottom: 3,
                }}
              >
                PICKUP TIME
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  color: "#9CA3AF",
                  fontWeight: "600",
                  marginBottom: 3,
                }}
              >
                {tripType === "ROUND_TRIP" ? "RETURN" : "END"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 24, gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={16} color="#6b7280" />
              <Text
                style={{
                  marginLeft: 6,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 12,
                }}
              >
                {startDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={14} color="#6b7280" />
              <Text
                style={{
                  marginLeft: 6,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 12,
                }}
              >
                {startDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShowEndPicker(true)}
            >
              <Calendar size={16} color="#6b7280" />
              <Text
                style={{
                  marginLeft: 6,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 12,
                }}
              >
                {endDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) {
                const newDate = new Date(d);
                newDate.setHours(startDate.getHours(), startDate.getMinutes());
                setStartDate(newDate);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display="default"
            onChange={(e, d) => {
              setShowTimePicker(false);
              if (d) {
                const newDate = new Date(startDate);
                newDate.setHours(d.getHours(), d.getMinutes());
                setStartDate(newDate);
              }
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
              if (d) {
                const newDate = new Date(d);
                newDate.setHours(endDate.getHours(), endDate.getMinutes());
                setEndDate(newDate);
              }
            }}
          />
        )}

        {/* Passengers */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Users size={20} color="#6b7280" />
            <Text
              style={{ marginLeft: 12, fontWeight: "600", color: "#374151" }}
            >
              Travellers
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <TouchableOpacity
              onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
              style={{
                backgroundColor: "#F3F4F6",
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#4B5563" }}
              >
                -
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                width: 24,
                textAlign: "center",
              }}
            >
              {passengerCount}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setPassengerCount(Math.min(12, passengerCount + 1))
              }
              style={{
                backgroundColor: "#F3F4F6",
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#4B5563" }}
              >
                +
              </Text>
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
          style={{
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 40,
            backgroundColor: loading
              ? "#D1D5DB"
              : isMockMode
                ? "#F59E0B"
                : !waypoints[0].address
                  ? "#D1D5DB"
                  : "#1B4F8A",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 18 }}
            >
              {isMockMode ? "Find Cabs (Mock)" : "Find Cabs"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingIndicator: {
    marginTop: 40,
  },
});
