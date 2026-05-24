import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../utils/api";
import RazorpayCheckout from "react-native-razorpay";
import { ShieldCheck, Zap } from "lucide-react-native";

import { useAuthStore } from "../../store/auth";
import { useMockStore, MOCK_WAYPOINTS, MOCK_DRIVER } from "../../store/mock";

export default function CheckoutScreen() {
  const params = useLocalSearchParams();
  const { tripId, amountPaidUpfront, totalFare, balance, vehicleSegment } =
    params;
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { isMockMode, setActiveMockTrip } = useMockStore();

  const isMockTrip =
    typeof tripId === "string" && tripId.startsWith("mock-trip-");

  const handlePayment = async () => {
    // ── MOCK MODE: simulate payment success ──
    if (isMockMode || isMockTrip) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1200)); // simulate payment processing

      const upfront = Number(amountPaidUpfront) || 0;
      const total = Number(totalFare) || 0;
      const bal = Number(balance) || 0;

      // Seed the mock store with full trip state
      setActiveMockTrip({
        tripId: typeof tripId === "string" ? tripId : `mock-trip-${Date.now()}`,
        status: "CONFIRMED",
        driver: null,
        waypoints: MOCK_WAYPOINTS,
        vehicleSegment:
          typeof vehicleSegment === "string" ? vehicleSegment : "SEDAN",
        totalFare: total,
        amountPaidUpfront: upfront,
        balanceRemaining: bal,
        startOtp: Math.floor(1000 + Math.random() * 9000).toString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        passengerCount: 2,
      });

      setLoading(false);
      router.replace({
        pathname: "/(customer)/trip-confirmed",
        params: { tripId },
      });
      return;
    }

    // ── REAL MODE (Bypass Razorpay) ──
    try {
      setLoading(true);
      const verifyRes = await api.post("/api/payments/bypass-verify", {
        tripId,
      });

      if (verifyRes.data.success) {
        Alert.alert("Success", "Payment successful! Your trip is confirmed.");
        router.replace({
          pathname: "/(customer)/trip-confirmed",
          params: { tripId },
        });
      }
    } catch (e: any) {
      Alert.alert(
        "Payment Failed",
        e.response?.data?.message || e.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <TopBar title="Checkout" onBack={() => router.back()} showBack />

      {/* Mock Mode indicator */}
      {(isMockMode || isMockTrip) && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            backgroundColor: "#FEF3C7",
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "#F59E0B",
          }}
        >
          <Zap size={14} color="#92400E" fill="#92400E" />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#92400E",
              fontWeight: "700",
            }}
          >
            Mock Payment — No real charge will be made
          </Text>
        </View>
      )}

      <View className="flex-1 px-5 pt-6">
        <View className="bg-white border border-brand-primary rounded-2xl p-5 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <ShieldCheck size={24} color="#1B4F8A" />
            <Text className="font-bold text-lg text-brand-primary ml-2">
              Secure Booking
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-600 font-medium">Total Trip Cost</Text>
            <Text className="font-bold text-gray-800">₹{totalFare}</Text>
          </View>
          <View className="flex-row justify-between mb-3 border-b border-gray-100 pb-3">
            <Text className="text-gray-600 font-medium">Balance to Driver</Text>
            <Text className="font-bold text-gray-800">₹{balance}</Text>
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-lg font-bold text-gray-800">Paying Now</Text>
            <Text className="text-lg font-bold text-green-600">
              ₹{amountPaidUpfront}
            </Text>
          </View>
        </View>

        <Text className="text-gray-500 text-sm text-center px-4 mb-8">
          Free cancellation up to 24 hours before start date.
        </Text>

        <TouchableOpacity
          disabled={loading}
          onPress={handlePayment}
          style={{
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: loading
              ? "#9CA3AF"
              : isMockMode || isMockTrip
                ? "#F59E0B"
                : "#1B4F8A",
          }}
        >
          {loading ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Processing payment...
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {isMockMode || isMockTrip
                ? `⚡ Simulate Pay ₹${amountPaidUpfront}`
                : `Pay ₹${amountPaidUpfront} Now`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
