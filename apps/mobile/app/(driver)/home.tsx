import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Bell, Phone, Car, MapPin, Navigation } from "lucide-react-native";
import { useDriverStore } from "../../store/driver";
import { useFocusEffect } from "expo-router";
import { api } from "../../utils/api";
import ActiveTripScreen from "../../components/ActiveTripScreen";

const JobCard = ({
  job,
  onAccept,
}: {
  job: any;
  onAccept: (id: string) => void;
}) => {
  return (
    <View
      style={{
        backgroundColor: "white",
        padding: 16,
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
              color: "#111827",
              textTransform: "uppercase",
            }}
          >
            {job.vehicleSegment}
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {job.passengerCount} Passengers
          </Text>
        </View>
        <Text style={{ fontWeight: "800", fontSize: 18, color: "#1B4F8A" }}>
          ₹{job.balanceRemaining}
        </Text>
      </View>

      <View style={{ marginTop: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MapPin size={16} color="#1B4F8A" />
          <Text
            style={{ color: "#374151", flex: 1, fontSize: 13 }}
            numberOfLines={1}
          >
            {job.waypoints?.[0]?.address}
          </Text>
        </View>

        {job.tripType === "ROUND_TRIP" &&
        (!job.waypoints || job.waypoints.length === 1) ? (
          <>
            <View
              style={{
                width: 1,
                height: 12,
                backgroundColor: "#DDE3ED",
                marginLeft: 7,
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Navigation size={16} color="#f59e0b" />
              <Text
                style={{
                  color: "#f59e0b",
                  flex: 1,
                  fontSize: 13,
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                Round Trip: Destination TBD by customer
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                width: 1,
                height: 12,
                backgroundColor: "#DDE3ED",
                marginLeft: 7,
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Navigation size={16} color="#1B4F8A" />
              <Text
                style={{ color: "#374151", flex: 1, fontSize: 13 }}
                numberOfLines={1}
              >
                {job.waypoints?.[job.waypoints.length - 1]?.address}
              </Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onAccept(job.id)}
        activeOpacity={0.8}
        style={{
          backgroundColor: "#1B4F8A",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
          Accept Job
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function DriverHome() {
  const goOnline = useDriverStore((s) => s.goOnline);
  const goOffline = useDriverStore((s) => s.goOffline);
  const isOnline = useDriverStore((s) => s.isOnline);
  const acceptRide = useDriverStore((s) => s.acceptRide);

  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  const toggleOnline = async () => {
    try {
      if (isOnline) {
        await goOffline();
        setAvailableJobs([]);
      } else {
        await goOnline();
        fetchJobs();
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

  const fetchJobs = async () => {
    if (!isOnline) return;
    try {
      const res = await api.get("/api/trips/available-jobs");
      setAvailableJobs(res.data?.data || []);
    } catch (err) {
      console.log("Failed to fetch jobs", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActiveTrip(), fetchJobs()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        fetchActiveTrip();
        fetchJobs();
      } else {
        setActiveTrip(null);
        setAvailableJobs([]);
      }
    }, [isOnline]),
  );

  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        if (!activeTrip) fetchJobs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isOnline, activeTrip]);

  const handleAcceptRide = async (rideId: string) => {
    try {
      await acceptRide(rideId);
      Alert.alert("Success", "Job accepted! Please proceed to pickup.");
      fetchActiveTrip();
      fetchJobs();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to accept ride",
      );
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
      fetchJobs();
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
              fetchJobs();
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
        onTripCompleted={() => {
          setActiveTrip(null);
          fetchJobs();
        }}
        onTripCancelled={() => {
          setActiveTrip(null);
          fetchJobs();
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <View>
          <Text style={{ color: "#1B4F8A", fontWeight: "800", fontSize: 20 }}>
            At Facility
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 12, fontWeight: "600" }}>
            Driver Dashboard
          </Text>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
          activeOpacity={0.8}
        >
          <Bell size={20} color="#1B4F8A" />
        </TouchableOpacity>
      </View>

      {/* Online toggle */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={toggleOnline}
          activeOpacity={0.9}
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: isOnline ? "#16a34a" : "#1B4F8A",
            shadowColor: isOnline ? "#16a34a" : "#1B4F8A",
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: isOnline ? "#4ade80" : "#9ca3af",
            }}
          />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
            {isOnline
              ? "You're Online — Tap to go Offline"
              : "You're Offline — Tap to go Online"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {activeTrip ? (
        /* Active Job Panel */
        <Animated.View
          entering={FadeInUp.springify()}
          style={{
            marginHorizontal: 20,
            backgroundColor: "white",
            borderRadius: 20,
            padding: 20,
            shadowColor: "#1B4F8A",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
            borderWidth: 1,
            borderColor: "#EEF2F7",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: "#EEF2F7",
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={{
                    color: "#16a34a",
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Active Job
                </Text>
                {activeTrip.pricingTier && (
                  <View
                    style={{
                      backgroundColor:
                        activeTrip.pricingTier === "ALL_INCLUSIVE"
                          ? "#DBEAFE"
                          : "#FEF3C7",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "700",
                        color:
                          activeTrip.pricingTier === "ALL_INCLUSIVE"
                            ? "#1E40AF"
                            : "#92400E",
                      }}
                    >
                      {activeTrip.pricingTier === "ALL_INCLUSIVE"
                        ? "All-Inclusive Fare"
                        : "Exclusion Fare"}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: "#111827",
                  fontWeight: "800",
                  fontSize: 18,
                  marginTop: 4,
                }}
              >
                {activeTrip.user?.name || "Passenger"}
              </Text>
            </View>
            {activeTrip.user?.phone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${activeTrip.user.phone}`)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#eff6ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Phone size={20} color="#1B4F8A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Address Details */}
          <View style={{ gap: 8, marginBottom: 16 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
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
                style={{ color: "#374151", fontSize: 13, flex: 1 }}
                numberOfLines={2}
              >
                <Text style={{ fontWeight: "700" }}>Pickup: </Text>
                {activeTrip.waypoints?.[0]?.address || "Pickup address"}
              </Text>
            </View>
            {activeTrip.tripType === "ROUND_TRIP" &&
            (!activeTrip.waypoints || activeTrip.waypoints.length === 1) ? (
              <>
                <View
                  style={{
                    width: 1.5,
                    height: 14,
                    backgroundColor: "#DDE3ED",
                    marginLeft: 4,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                  <Text
                    style={{
                      color: "#f59e0b",
                      fontSize: 13,
                      flex: 1,
                      fontWeight: "600",
                    }}
                    numberOfLines={2}
                  >
                    <Text style={{ fontWeight: "700" }}>Drop: </Text>
                    Destination TBD by customer
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View
                  style={{
                    width: 1.5,
                    height: 14,
                    backgroundColor: "#DDE3ED",
                    marginLeft: 4,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
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
                    style={{ color: "#374151", fontSize: 13, flex: 1 }}
                    numberOfLines={2}
                  >
                    <Text style={{ fontWeight: "700" }}>Drop: </Text>
                    {activeTrip.waypoints?.[activeTrip.waypoints.length - 1]
                      ?.address || "Drop address"}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Price & Cash info */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#EEF2F7",
                borderRadius: 16,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#6b7280",
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                Total Fare
              </Text>
              <Text
                style={{
                  color: "#1B4F8A",
                  fontWeight: "800",
                  fontSize: 16,
                  marginTop: 2,
                }}
              >
                ₹{activeTrip.totalFare}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f0fdf4",
                borderRadius: 16,
                padding: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#bbf7d0",
              }}
            >
              <Text
                style={{
                  color: "#15803d",
                  fontSize: 10,
                  fontWeight: "800",
                  textTransform: "uppercase",
                }}
              >
                Collect Cash
              </Text>
              <Text
                style={{
                  color: "#166534",
                  fontWeight: "800",
                  fontSize: 18,
                  marginTop: 2,
                }}
              >
                ₹{activeTrip.balanceRemaining ?? 0}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleCancelTrip}
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: "#ef4444",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#ef4444", fontWeight: "700", fontSize: 14 }}
              >
                Cancel Job
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStartTrip}
              style={{
                flex: 2,
                backgroundColor: "#1B4F8A",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>
                Start Trip
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : !isOnline ? (
        /* Offline prompt */
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
              width: "100%",
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#EEF2F7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Car size={40} color="#1B4F8A" />
            </View>
            <Text
              style={{
                color: "#111827",
                fontWeight: "800",
                fontSize: 20,
                textAlign: "center",
              }}
            >
              You're Offline
            </Text>
            <Text
              style={{
                color: "#6b7280",
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              Go online to start receiving ride requests and view available
              jobs.
            </Text>
          </View>
        </View>
      ) : (
        /* Available Jobs List */
        <View style={{ flex: 1 }}>
          <Text
            style={{
              marginHorizontal: 20,
              marginBottom: 12,
              fontWeight: "800",
              color: "#111827",
              fontSize: 16,
            }}
          >
            Available Jobs
          </Text>
          <FlatList
            data={availableJobs}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1B4F8A"
              />
            }
            renderItem={({ item }) => (
              <JobCard job={item} onAccept={handleAcceptRide} />
            )}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator
                  color="#1B4F8A"
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    color: "#6b7280",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  Searching for available jobs...
                </Text>
                <Text
                  style={{
                    color: "#9ca3af",
                    textAlign: "center",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Pull down to refresh
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      )}

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{ backgroundColor: "white", padding: 24, borderRadius: 24 }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Enter Trip OTP
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
              Ask the passenger for the 4-digit OTP to start the trip.
            </Text>

            <TextInput
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0 0 0 0"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#DDE3ED",
                borderRadius: 16,
                padding: 16,
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                letterSpacing: 8,
                marginBottom: 24,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setOtpModalVisible(false)}
                style={{
                  flex: 1,
                  padding: 16,
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor: "#EEF2F7",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#4b5563" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitStartTrip}
                style={{
                  flex: 2,
                  padding: 16,
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor: "#1B4F8A",
                }}
              >
                <Text style={{ fontWeight: "800", color: "white" }}>
                  Verify & Start
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
