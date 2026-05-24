import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../utils/api";
import { getSocket, EVENTS } from "../../utils/socket";
import TopBar from "../../components/layout/TopBar";
import { useAuthStore } from "../../store/auth";
import { MapPin, Calendar, CreditCard } from "lucide-react-native";
import { router } from "expo-router";

export default function DriverJobsScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const { user } = useAuthStore();

  useEffect(() => {
    fetchJobsAndStatus();

    const socket = getSocket();
    if (socket) {
      socket.on(EVENTS.TRIP_JOB_AVAILABLE, (job) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setJobs((prev) => [job, ...prev]);
      });
      socket.on(EVENTS.TRIP_JOB_TAKEN, (data) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setJobs((prev) =>
          prev.filter((j) => j.tripId !== data.tripId && j.id !== data.tripId),
        );
      });
    }

    return () => {
      if (socket) {
        socket.off(EVENTS.TRIP_JOB_AVAILABLE);
        socket.off(EVENTS.TRIP_JOB_TAKEN);
      }
    };
  }, []);

  const fetchJobsAndStatus = async () => {
    try {
      const kycRes = await api.get("/api/kyc/status");
      setKycStatus(kycRes.data.data.status);

      const jobsRes = await api.get("/api/trips/available-jobs");
      setJobs(jobsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (tripId: string) => {
    const socket = getSocket();
    if (socket && user) {
      socket.emit(EVENTS.DRIVER_ACCEPT_JOB, { tripId, driverId: user.id });
      // Remove optimistically
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setJobs((prev) =>
        prev.filter((j) => j.id !== tripId && j.tripId !== tripId),
      );
      // In a real app we'd navigate to active trip dashboard
      router.push("/(driver)/home");
    }
  };

  const renderHeader = () => {
    if (kycStatus === "VERIFIED") {
      return (
        <View className="bg-green-100 p-3 rounded-lg mb-4 flex-row items-center">
          <Text className="text-green-800 font-bold flex-1 text-center">
            ✓ Verified Driver — You can accept jobs.
          </Text>
        </View>
      );
    }
    if (kycStatus === "REJECTED") {
      return (
        <View className="bg-red-100 p-3 rounded-lg mb-4 items-center">
          <Text className="text-red-800 font-bold mb-1">
            Your KYC was rejected.
          </Text>
          <Text className="text-red-600 text-xs">Contact support.</Text>
        </View>
      );
    }
    return (
      <View className="bg-amber-100 p-3 rounded-lg mb-4 flex-row items-center justify-between">
        <Text className="text-amber-800 font-semibold text-xs flex-1">
          Complete KYC to accept jobs.
        </Text>
        <TouchableOpacity onPress={() => router.push("/(driver)/kyc")}>
          <Text className="text-brand-primary font-bold text-xs">
            Go to KYC →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1B4F8A" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <TopBar title="Job Board" />
      <View className="flex-1 px-4 pt-4">
        {renderHeader()}

        {jobs.length === 0 && kycStatus === "VERIFIED" ? (
          <View className="flex-1 items-center justify-center pb-20">
            <Text className="text-4xl mb-4">🗺️</Text>
            <Text className="text-gray-500 text-center px-10">
              No trips available right now. Stay online to see new jobs as they
              come in.
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id || item.tripId}
            renderItem={({ item }) => (
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row justify-between items-start border-b border-gray-100 pb-3 mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-gray-800 text-base mb-1">
                      {item.tripType === "ROUND_TRIP" ? "🔄 ROUND TRIP\n" : ""}
                      {item.waypoints
                        ?.map((w: any) => w.address.split(",")[0])
                        .join(" → ") ||
                        `${item.pickupAddress?.split(",")[0]} → ${item.destinationAddress?.split(",")[0]}`}
                    </Text>
                    <Text
                      className="text-xs text-gray-500 mt-1"
                      numberOfLines={2}
                    >
                      Pickup:{" "}
                      {item.waypoints?.[0]?.address || item.pickupAddress}
                    </Text>
                  </View>
                  <View className="bg-blue-50 px-2 py-1 rounded">
                    <Text className="text-brand-primary font-bold text-xs">
                      {item.vehicleSegment}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mb-3 flex-wrap gap-y-2">
                  <View className="flex-row items-center mr-4">
                    <Calendar size={14} color="#6b7280" />
                    <Text className="text-xs text-gray-600 ml-1">
                      {new Date(item.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center mr-4">
                    <Text className="text-[12px] text-gray-500 mr-1">🕒</Text>
                    <Text className="text-xs text-gray-600">
                      {new Date(item.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {item.endDate && (
                    <View className="flex-row items-center mr-4">
                      <Text className="text-[12px] text-gray-500 mr-1">🏁</Text>
                      <Text className="text-xs text-gray-600">
                        {new Date(item.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center">
                    <Text className="text-xs text-gray-600">
                      👤 {item.passengerCount} Pax
                    </Text>
                  </View>
                </View>

                <View className="bg-gray-50 p-3 rounded-xl flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-[10px] text-gray-500">
                      Total Fare
                    </Text>
                    <Text className="font-semibold text-gray-700">
                      ₹{item.totalFare}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] text-green-600 font-bold">
                      Your Earning (cash)
                    </Text>
                    <Text className="font-bold text-green-600 text-lg">
                      ₹{item.driverEarning || item.balanceRemaining}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  disabled={kycStatus !== "VERIFIED"}
                  onPress={() => handleAccept(item.id || item.tripId)}
                  className={`py-3 rounded-xl items-center ${kycStatus !== "VERIFIED" ? "bg-gray-300" : "bg-brand-primary"}`}
                >
                  <Text className="text-white font-bold">
                    {kycStatus !== "VERIFIED"
                      ? "Verify KYC to Accept"
                      : "Accept Job"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
