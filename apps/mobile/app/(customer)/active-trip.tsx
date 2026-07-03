import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../utils/api";
import {
  Phone,
  CheckCircle,
  Info,
  Zap,
  User,
  CreditCard,
} from "lucide-react-native";
import { useMockStore, MockTripStatus } from "../../store/mock";
import { useAuthStore } from "../../store/auth";
import RazorpayCheckout from "react-native-razorpay";

const STATUS_STEPS: MockTripStatus[] = [
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_ENROUTE",
  "ACTIVE",
  "COMPLETED",
];

const STATUS_LABELS = ["Confirmed", "Assigned", "En Route", "Active", "Done"];

const STATUS_SEQUENCE: MockTripStatus[] = [
  "DRIVER_ASSIGNED",
  "DRIVER_ENROUTE",
  "ACTIVE",
  "COMPLETED",
];

export default function ActiveTripScreen() {
  const { tripId } = useLocalSearchParams();
  const { activeMockTrip, updateActiveMockTrip, isMockMode } = useMockStore();
  const isMockTrip =
    typeof tripId === "string" && tripId.startsWith("mock-trip-");

  const user = useAuthStore((s) => s.user);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const razorpayAvailable = typeof RazorpayCheckout?.open === "function";

  const handlePayBalance = async () => {
    if (isMockTrip || isMockMode) {
      setPaymentLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      updateActiveMockTrip({
        amountPaidUpfront: activeMockTrip?.totalFare || trip?.totalFare || 0,
        balanceRemaining: 0,
      });
      setPaymentLoading(false);
      Alert.alert("Success", "Balance paid successfully!");
      return;
    }

    if (!razorpayAvailable) {
      Alert.alert(
        "Dev Mode",
        "Razorpay native module not available (Expo Go).",
      );
      return;
    }

    setPaymentLoading(true);
    try {
      const orderRes = await api.post("/api/payments/create-balance-order", {
        tripId,
      });
      const { razorpayOrderId, amount, currency, razorpayKeyId } =
        orderRes.data.data;

      const razorpayOptions = {
        description: "At Facility Balance Payment",
        image: "",
        currency: currency ?? "INR",
        key: razorpayKeyId,
        amount: String(amount),
        name: "At Facility",
        order_id: razorpayOrderId,
        prefill: {
          email: user?.email ?? "",
          contact: user?.phone ?? "",
          name: user?.name ?? "",
        },
        theme: { color: "#1B4F8A" },
      };

      const paymentData = await RazorpayCheckout.open(razorpayOptions);

      const verifyRes = await api.post("/api/payments/verify-balance", {
        tripId,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      if (verifyRes.data.success) {
        Alert.alert("Success", "Balance paid successfully!");
        fetchTrip();
      } else {
        throw new Error("Verification failed");
      }
    } catch (e: any) {
      if (
        e?.code === "PAYMENT_CANCELLED" ||
        e?.description === "Cancelled by user"
      ) {
        setPaymentLoading(false);
        return;
      }
      Alert.alert(
        "Error",
        e.response?.data?.message ?? e.message ?? "Payment failed",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sequenceIndexRef = useRef(0);

  // ── Load trip data ──
  useEffect(() => {
    if (isMockTrip || isMockMode) {
      // Load from mock store — no network call needed
      if (activeMockTrip) {
        setTrip(buildTripFromMock(activeMockTrip));
      }
      setLoading(false);
      return;
    }
    fetchTrip();
  }, []);

  // ── Subscribe to mock store changes so UI re-renders on status updates ──
  useEffect(() => {
    if ((isMockTrip || isMockMode) && activeMockTrip) {
      setTrip(buildTripFromMock(activeMockTrip));
    }
  }, [activeMockTrip?.status, activeMockTrip?.driver]);

  // ── Mock status progression: advances every 5 seconds ──
  useEffect(() => {
    if (!isMockTrip && !isMockMode) return;

    intervalRef.current = setInterval(() => {
      const nextStatus = STATUS_SEQUENCE[sequenceIndexRef.current];
      if (!nextStatus) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      sequenceIndexRef.current += 1;
      updateActiveMockTrip({ status: nextStatus });

      if (nextStatus === "COMPLETED") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => {
          Alert.alert(
            "Trip Completed",
            "Thank you for travelling with At Facility. Have a great stay!",
            [
              {
                text: "Done",
                onPress: () => router.replace("/(customer)/plan-trip"),
              },
            ],
          );
        }, 500);
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMockTrip, isMockMode]);

  // ── Polling for status updates ──
  useEffect(() => {
    if (isMockTrip || isMockMode) return;

    const interval = setInterval(() => {
      fetchTrip();
    }, 12000); // 12 seconds

    return () => clearInterval(interval);
  }, [isMockTrip, isMockMode, tripId]);

  const fetchTrip = async () => {
    try {
      const res = await api.get(`/api/trips/${tripId}`);
      setTrip(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrip();
    setRefreshing(false);
  };

  const handleCancel = async () => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          if (isMockTrip || isMockMode) {
            // Mock cancel — just go back home
            Alert.alert("Cancelled", "Mock trip cancelled.");
            router.replace("/(customer)/plan-trip");
            return;
          }
          try {
            await api.put(`/api/trips/${tripId}/cancel`, {
              reason: "User requested",
            });
            Alert.alert("Cancelled", "Trip cancelled successfully.");
            router.replace("/(customer)/plan-trip");
          } catch (e) {
            Alert.alert("Error", "Failed to cancel trip.");
          }
        },
      },
    ]);
  };

  if (loading || !trip) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Loading trip...</Text>
      </SafeAreaView>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(trip.status as MockTripStatus);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <TopBar
        title="Trip Details"
        onBack={() => router.push("/(customer)/plan-trip")}
        showBack
      />

      {/* Mock Mode badge */}
      {(isMockMode || isMockTrip) && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 6,
            marginBottom: 2,
            backgroundColor: "#FEF3C7",
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: "#F59E0B",
          }}
        >
          <Zap size={12} color="#92400E" fill="#92400E" />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 11,
              color: "#92400E",
              fontWeight: "700",
            }}
          >
            MOCK MODE — Status auto-advances every 5 seconds
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1 px-5 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B4F8A"
          />
        }
      >
        {/* Status Tracker */}
        <View className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            {STATUS_LABELS.slice(0, 5).map((step, i) => (
              <View key={i} className="items-center flex-1">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${i <= currentStep ? "bg-green-500" : "bg-gray-200"}`}
                >
                  {i <= currentStep && <CheckCircle size={14} color="#FFF" />}
                </View>
                <Text className="text-[10px] mt-1 text-gray-600 text-center">
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {/* Progress connector line */}
          <View
            style={{
              position: "absolute",
              top: 30,
              left: "10%",
              right: "10%",
              height: 2,
              backgroundColor: "#E5E7EB",
              zIndex: 0,
            }}
          >
            <View
              style={{
                width: `${Math.min(100, (currentStep / (STATUS_STEPS.length - 1)) * 100)}%`,
                height: "100%",
                backgroundColor: "#22c55e",
              }}
            />
          </View>
        </View>

        {/* Route summary */}
        {trip.waypoints && trip.waypoints.length > 0 && (
          <View className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
            <Text className="font-bold text-gray-800 mb-2">Route</Text>
            {trip.waypoints.map((wp: any, i: number) => (
              <View key={i} className="flex-row items-start mb-1">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      i === 0
                        ? "#22c55e"
                        : i === trip.waypoints.length - 1
                          ? "#ef4444"
                          : "#f59e0b",
                    marginTop: 6,
                    marginRight: 8,
                  }}
                />
                <Text className="text-sm text-gray-700 flex-1">
                  {wp.address}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Driver Info */}
        {trip.driver && (
          <View className="bg-white p-4 rounded-2xl mb-4 shadow-sm flex-row items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
              <User size={22} color="#1B4F8A" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-800">
                {trip.driver.name ?? trip.driver.user?.name}
              </Text>
              <Text className="text-xs text-gray-500">
                {trip.driver.vehicleModel ??
                  trip.driver.vehicle?.model ??
                  "Vehicle"}{" "}
                • {trip.driver.plateNumber ?? trip.driver.vehicle?.plateNumber}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `tel:${trip.driver.phone ?? trip.driver.user?.phone}`,
                )
              }
              className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center"
            >
              <Phone size={20} color="#1B4F8A" />
            </TouchableOpacity>
          </View>
        )}

        {/* OTP */}
        {(trip.status === "CONFIRMED" ||
          trip.status === "DRIVER_ASSIGNED" ||
          trip.status === "DRIVER_ENROUTE") && (
          <View className="bg-brand-primary p-6 rounded-2xl mb-4 shadow-sm items-center">
            <Text className="text-white text-sm opacity-80 mb-2">
              Share PIN with driver to start trip
            </Text>
            <Text className="text-white text-4xl font-mono tracking-widest font-bold">
              {trip.startOtp}
            </Text>
          </View>
        )}

        {/* Financials */}
        <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">
            Payment Details
          </Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Fare</Text>
            <Text className="font-bold text-gray-800">₹{trip.totalFare}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Paid Online</Text>
            <Text className="font-bold text-green-600">
              ₹{trip.amountPaidUpfront} (Paid)
            </Text>
          </View>
          <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
            <Text className="font-bold text-gray-800">Balance</Text>
            <Text className="font-bold text-orange-500">
              ₹
              {trip.balanceRemaining ?? trip.totalFare - trip.amountPaidUpfront}
            </Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600">Payment Method</Text>
            <Text className="font-bold text-gray-800">Online</Text>
          </View>

          {/* Pay Balance Button */}
          {(trip.balanceRemaining ?? trip.totalFare - trip.amountPaidUpfront) >
            0 && (
            <TouchableOpacity
              onPress={handlePayBalance}
              disabled={paymentLoading}
              className={`mt-4 p-3 rounded-xl flex-row items-center justify-center ${paymentLoading ? "bg-gray-400" : "bg-brand-primary"}`}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <CreditCard size={18} color="#fff" />
                  <Text className="text-white font-bold ml-2">
                    Pay Balance Online
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel Button */}
        {(trip.status === "CONFIRMED" || trip.status === "DRIVER_ASSIGNED") && (
          <TouchableOpacity
            onPress={handleCancel}
            className="mt-4 p-4 items-center mb-8"
          >
            <Text className="text-red-500 font-bold">Cancel Trip</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shape mock store data into the same shape the real API returns ──
function buildTripFromMock(
  mockTrip: NonNullable<
    ReturnType<typeof useMockStore.getState>["activeMockTrip"]
  >,
) {
  return {
    status: mockTrip.status,
    startOtp: mockTrip.startOtp,
    totalFare: mockTrip.totalFare,
    amountPaidUpfront: mockTrip.amountPaidUpfront,
    balanceRemaining: mockTrip.balanceRemaining,
    waypoints: mockTrip.waypoints,
    driver: mockTrip.driver
      ? {
          name: mockTrip.driver.name,
          phone: mockTrip.driver.phone,
          vehicleModel: mockTrip.driver.vehicleModel,
          plateNumber: mockTrip.driver.plateNumber,
        }
      : null,
  };
}
