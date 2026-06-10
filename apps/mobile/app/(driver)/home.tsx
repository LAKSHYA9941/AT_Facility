import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import { useDriverStore } from "../../store/driver";
import { useFocusEffect } from "expo-router";
import { api } from "../../utils/api";
import ActiveTripScreen from "../../components/ActiveTripScreen";

const TODAY_STATS = [
  { val: "6", label: "Trips" },
  { val: "₹1,840", label: "Earned" },
  { val: "4.9★", label: "Rating" },
  { val: "5.2hr", label: "Online" },
];

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#e8edf5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1B4F8A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#dde3ed" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8d8e4" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export default function DriverHome() {
  const goOnline = useDriverStore((s) => s.goOnline);
  const goOffline = useDriverStore((s) => s.goOffline);
  const isOnline = useDriverStore((s) => s.isOnline);
  const rideRequest = useDriverStore((s) => s.rideRequest);
  const acceptRide = useDriverStore((s) => s.acceptRide);
  const declineRide = useDriverStore((s) => s.declineRide);

  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  const toggleOnline = async () => {
    try {
      if (isOnline) {
        await goOffline();
      } else {
        await goOnline();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update online status");
    }
  };

  const fetchActiveTrip = async () => {
    try {
      const res = await api.get("/api/trips/driver/my");
      // Find a trip with status DRIVER_ASSIGNED or ACTIVE
      const active = res.data?.data?.find(
        (t: any) => t.status === "DRIVER_ASSIGNED" || t.status === "ACTIVE",
      );
      setActiveTrip(active || null);
    } catch (err) {
      console.log("Failed to fetch active trip", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        fetchActiveTrip();
      } else {
        setActiveTrip(null);
      }
    }, [isOnline]),
  );

  useEffect(() => {
    if (isOnline) {
      fetchActiveTrip();
    } else {
      setActiveTrip(null);
    }
  }, [isOnline]);

  const handleAcceptRide = async (rideId: string) => {
    try {
      await acceptRide(rideId);
      setTimeout(() => {
        fetchActiveTrip();
      }, 800);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept ride");
    }
  };

  const handleStartTrip = () => {
    setOtpInput("");
    setOtpModalVisible(true);
  };

  const submitStartTrip = async () => {
    if (!activeTrip) return;
    if (!otpInput || otpInput.trim().length < 4) {
      Alert.alert("Error", "Please enter a valid 4-digit OTP");
      return;
    }
    try {
      await api.post(`/api/trips/${activeTrip.id}/start`, {
        otp: otpInput.trim(),
      });
      Alert.alert("Success", "Trip started successfully!");
      setOtpModalVisible(false);
      fetchActiveTrip();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to start trip",
      );
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.post(`/api/trips/${activeTrip.id}/complete`);
      Alert.alert("Success", "Trip completed successfully! Drive safe.");
      setActiveTrip(null);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to complete trip",
      );
    }
  };

  const handleCancelTrip = () => {
    if (!activeTrip) return;
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this job? This will return it to the available board.",
      [
        { text: "No, Keep Job", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/api/trips/${activeTrip.id}/driver-cancel`, {
                reason: "Driver cancelled via mobile",
              });
              Alert.alert(
                "Cancelled",
                "Trip cancelled and returned to the board.",
              );
              setActiveTrip(null);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ||
                  err.message ||
                  "Failed to cancel trip",
              );
            }
          },
        },
      ],
    );
  };

  // ── If the trip is ACTIVE, render the immersive in-trip screen ──
  if (activeTrip?.status === "ACTIVE") {
    return (
      <ActiveTripScreen
        trip={activeTrip}
        onTripCompleted={() => setActiveTrip(null)}
        onTripCancelled={() => setActiveTrip(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Map — root level, full screen */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        zoomTapEnabled
        moveOnMarkerPress={false}
      >
        {activeTrip &&
          activeTrip.waypoints &&
          activeTrip.waypoints.length > 0 && (
            <>
              <Marker
                coordinate={{
                  latitude: activeTrip.waypoints[0].lat,
                  longitude: activeTrip.waypoints[0].lng,
                }}
                title="Pickup Point"
                description={activeTrip.waypoints[0].address}
              />
              <Marker
                coordinate={{
                  latitude:
                    activeTrip.waypoints[activeTrip.waypoints.length - 1].lat,
                  longitude:
                    activeTrip.waypoints[activeTrip.waypoints.length - 1].lng,
                }}
                title="Destination Point"
                description={
                  activeTrip.waypoints[activeTrip.waypoints.length - 1].address
                }
                pinColor="green"
              />
            </>
          )}
      </MapView>

      {/* Overlay — box-none so map gets gestures */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="box-none"
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={["top"]}
          pointerEvents="box-none"
        >
          {/* Topbar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
            pointerEvents="box-none"
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 15 }}
              >
                At Facility
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 11 }}>
                Driver Mode
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Online toggle */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <TouchableOpacity
              onPress={toggleOnline}
              activeOpacity={0.9}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: isOnline ? "#16a34a" : "#1B4F8A",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
                {isOnline
                  ? "🟢  You're Online — Tap to go Offline"
                  : "⚫  You're Offline — Tap to go Online"}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTrip ? (
            /* Active Job Panel */
            <Animated.View
              entering={FadeInUp.springify()}
              style={{
                marginHorizontal: 20,
                marginTop: 12,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 16,
                shadowColor: "#1B4F8A",
                shadowOpacity: 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 5,
                borderWidth: 1,
                borderColor: "#DDE3ED",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: "#EEF2F7",
                  paddingBottom: 10,
                  marginBottom: 10,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 10,
                      fontWeight: "600",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {activeTrip.status === "DRIVER_ASSIGNED"
                      ? "🎯 Job Accepted — Heading to Pickup"
                      : "🚕 Trip in Progress"}
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "700",
                      fontSize: 15,
                      marginTop: 2,
                    }}
                  >
                    {activeTrip.user?.name || "Passenger"}
                  </Text>
                </View>
                {activeTrip.user?.phone && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`tel:${activeTrip.user.phone}`)
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#eff6ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>📞</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Address Details */}
              <View style={{ gap: 6, marginBottom: 12 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: "#1B4F8A",
                    }}
                  />
                  <Text
                    style={{ color: "#374151", fontSize: 12, flex: 1 }}
                    numberOfLines={1}
                  >
                    Pickup:{" "}
                    {activeTrip.waypoints?.[0]?.address || "Pickup address"}
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    height: 10,
                    backgroundColor: "#DDE3ED",
                    marginLeft: 3,
                  }}
                />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 1.5,
                      backgroundColor: "#1B4F8A",
                    }}
                  />
                  <Text
                    style={{ color: "#374151", fontSize: 12, flex: 1 }}
                    numberOfLines={1}
                  >
                    Drop:{" "}
                    {activeTrip.waypoints?.[activeTrip.waypoints.length - 1]
                      ?.address || "Drop address"}
                  </Text>
                </View>
              </View>

              {/* Price & Cash info */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#EEF2F7",
                    borderRadius: 12,
                    padding: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 9,
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    Total Fare
                  </Text>
                  <Text
                    style={{
                      color: "#1B4F8A",
                      fontWeight: "700",
                      fontSize: 14,
                      marginTop: 1,
                    }}
                  >
                    ₹{activeTrip.totalFare}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#f0fdf4",
                    borderRadius: 12,
                    padding: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#dcfce7",
                  }}
                >
                  <Text
                    style={{
                      color: "#15803d",
                      fontSize: 9,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    Collect Cash
                  </Text>
                  <Text
                    style={{
                      color: "#166534",
                      fontWeight: "800",
                      fontSize: 16,
                      marginTop: 1,
                    }}
                  >
                    ₹{activeTrip.balanceRemaining ?? 0}
                  </Text>
                </View>
              </View>

              {/* OTP Input Trigger is handled via Start Trip button */}

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                {activeTrip.status === "DRIVER_ASSIGNED" ? (
                  <>
                    <TouchableOpacity
                      onPress={handleCancelTrip}
                      style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: "#ef4444",
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#ef4444",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Cancel Job
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleStartTrip}
                      style={{
                        flex: 2,
                        backgroundColor: "#1B4F8A",
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Start Trip
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={handleCompleteTrip}
                    style={{
                      flex: 1,
                      backgroundColor: "#16a34a",
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: 14,
                      }}
                    >
                      Complete Trip & Collect Cash
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          ) : (
            <>
              {/* Stats card */}
              <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.95)",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 10,
                      fontWeight: "600",
                      letterSpacing: 1,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Today
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {TODAY_STATS.map((s) => (
                      <View
                        key={s.label}
                        style={{
                          flex: 1,
                          backgroundColor: "#EEF2F7",
                          borderRadius: 12,
                          paddingVertical: 10,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#1B4F8A",
                            fontWeight: "700",
                            fontSize: 13,
                          }}
                        >
                          {s.val}
                        </Text>
                        <Text
                          style={{
                            color: "#9CA3AF",
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          {s.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Offline prompt */}
              {!isOnline && (
                <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      borderRadius: 16,
                      padding: 20,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🚗</Text>
                    <Text
                      style={{
                        color: "#111827",
                        fontWeight: "700",
                        fontSize: 15,
                        textAlign: "center",
                      }}
                    >
                      Go online to start earning
                    </Text>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      Tap the button above when you're ready
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Spacer */}
          <View style={{ flex: 1 }} pointerEvents="box-none" />

          {rideRequest && (
            <Animated.View
              entering={FadeInUp.springify()}
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 32,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#DDE3ED",
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 10,
                      fontWeight: "600",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    New Ride Request
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "700",
                      fontSize: 18,
                    }}
                  >
                    {rideRequest.segment}
                  </Text>
                </View>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 3,
                    borderColor: "#1B4F8A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                ></View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  backgroundColor: "#EEF2F7",
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#1B4F8A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontWeight: "700", fontSize: 13 }}
                  >
                    {rideRequest.passenger.name?.slice(0, 2).toUpperCase() ||
                      "PS"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {rideRequest.passenger.name}
                  </Text>
                </View>
                <Text
                  style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 16 }}
                >
                  ₹{rideRequest.fare}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "#EEF2F7",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: "#1B4F8A",
                    }}
                  />
                  <Text
                    style={{ color: "#111827", fontSize: 13, flex: 1 }}
                    numberOfLines={1}
                  >
                    {rideRequest.pickup.address}
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    height: 14,
                    backgroundColor: "#DDE3ED",
                    marginLeft: 4,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: "#1B4F8A",
                    }}
                  />
                  <Text
                    style={{ color: "#111827", fontSize: 13, flex: 1 }}
                    numberOfLines={1}
                  >
                    {rideRequest.drop.address}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {rideRequest.distance} km · Est. fare ₹{rideRequest.fare}
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => declineRide(rideRequest.rideId)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: "#DDE3ED",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    Decline
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAcceptRide(rideRequest.rideId)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    backgroundColor: "#1B4F8A",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontWeight: "700", fontSize: 15 }}
                  >
                    Accept
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Enter Start OTP
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Ask the passenger for the 4-digit OTP to start the trip safely.
            </Text>
            <TextInput
              style={{
                width: "100%",
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                padding: 16,
                fontSize: 24,
                fontWeight: "700",
                letterSpacing: 8,
                textAlign: "center",
                color: "#1B4F8A",
                marginBottom: 20,
              }}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#DDE3ED",
                  alignItems: "center",
                }}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text
                  style={{ color: "#4B5563", fontWeight: "600", fontSize: 15 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: "#1B4F8A",
                  alignItems: "center",
                }}
                onPress={submitStartTrip}
              >
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 15 }}
                >
                  Start Trip
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
