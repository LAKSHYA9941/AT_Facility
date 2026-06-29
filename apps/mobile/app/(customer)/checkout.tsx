import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../utils/api";
// react-native-razorpay requires a custom dev build (expo run:android).
// In Expo Go, always use bypass payment.
const RazorpayCheckout: any = null;
import {
  ShieldCheck,
  Zap,
  CreditCard,
  RefreshCcw,
  CheckCircle,
} from "lucide-react-native";

import { useAuthStore } from "../../store/auth";
import { useMockStore, MOCK_WAYPOINTS } from "../../store/mock";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// No hardcoded key needed. Key is fetched from backend order payload.

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const params = useLocalSearchParams();
  const { tripId, amountPaidUpfront, totalFare, balance, vehicleSegment } =
    params;
  const [loading, setLoading] = useState(false);
  const [paymentState, setPaymentState] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const { isMockMode, setActiveMockTrip } = useMockStore();

  const isMockTrip =
    typeof tripId === "string" && tripId.startsWith("mock-trip-");
  const isMock = isMockMode || isMockTrip;

  const upfront = Number(amountPaidUpfront) || 0;
  const total = Number(totalFare) || 0;
  const bal = Number(balance) || 0;

  // ── Navigate to confirmed screen ──
  const goToConfirmed = () => {
    router.replace({
      pathname: "/(customer)/trip-confirmed",
      params: { tripId },
    });
  };

  // ── Mock payment (simulate) ──
  const handleMockPayment = async () => {
    setLoading(true);
    setPaymentState("processing");
    await new Promise((r) => setTimeout(r, 1200));

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

    setPaymentState("success");
    setLoading(false);
    setTimeout(goToConfirmed, 600);
  };

  // ── Real Razorpay payment ──
  const handleRazorpayPayment = async () => {
    setLoading(true);
    setPaymentState("processing");
    setErrorMessage(null);

    try {
      // Step 1: Create order on backend
      const orderRes = await api.post("/api/payments/create-order", { tripId });
      const { orderId, amount, currency, key } = orderRes.data.data;

      // Step 2: Open Razorpay checkout sheet
      const razorpayOptions = {
        description: "At Facility Trip Payment",
        image: "", // logo url if available
        currency: currency ?? "INR",
        key: key,
        amount: String(amount), // amount in paise
        name: "At Facility",
        order_id: orderId,
        prefill: {
          email: user?.email ?? "",
          contact: user?.phone ?? "",
          name: user?.name ?? "",
        },
        theme: { color: "#1B4F8A" },
      };

      const paymentData = await RazorpayCheckout.open(razorpayOptions);

      // Step 3: Verify on backend
      const verifyRes = await api.post("/api/payments/verify", {
        tripId,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      if (verifyRes.data.success) {
        setPaymentState("success");
        setLoading(false);
        setTimeout(goToConfirmed, 600);
      } else {
        throw new Error("Verification failed");
      }
    } catch (e: any) {
      // User cancelled Razorpay sheet
      if (
        e?.code === "PAYMENT_CANCELLED" ||
        e?.description === "Cancelled by user"
      ) {
        setPaymentState("idle");
        setLoading(false);
        return;
      }
      setPaymentState("failed");
      setErrorMessage(
        e.response?.data?.message ??
          e.message ??
          "Payment could not be completed",
      );
      setLoading(false);
    }
  };

  // ── Bypass payment (dev/fallback when no Razorpay key) ──
  const handleBypassPayment = async () => {
    setLoading(true);
    setPaymentState("processing");
    setErrorMessage(null);

    try {
      const verifyRes = await api.post("/api/payments/bypass-verify", {
        tripId,
      });
      if (verifyRes.data.success) {
        setPaymentState("success");
        setLoading(false);
        setTimeout(goToConfirmed, 600);
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (e: any) {
      setPaymentState("failed");
      setErrorMessage(
        e.response?.data?.message ?? e.message ?? "Payment failed",
      );
      setLoading(false);
    }
  };

  // ── Primary payment handler ──
  const razorpayAvailable = typeof RazorpayCheckout?.open === "function";

  const handlePayment = () => {
    if (isMock) {
      handleMockPayment();
    } else if (razorpayAvailable) {
      handleRazorpayPayment();
    } else {
      // Native module unavailable (Expo Go) or no key — use bypass
      Alert.alert(
        "Dev Mode",
        "Razorpay native module not available (Expo Go). Using bypass payment.",
        [
          { text: "Cancel", style: "cancel", onPress: () => {} },
          { text: "Proceed (Dev)", onPress: handleBypassPayment },
        ],
      );
    }
  };

  // ── Retry on failure ──
  const handleRetry = () => {
    setPaymentState("idle");
    setErrorMessage(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#EEF2F7" }}
      edges={["top"]}
    >
      <TopBar title="Checkout" onBack={() => router.back()} showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mock / Dev badge ── */}
        {isMock && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "#F59E0B",
              marginBottom: 16,
              gap: 8,
            }}
          >
            <Zap size={14} color="#92400E" fill="#92400E" />
            <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "700" }}>
              Mock Payment — No real charge will be made
            </Text>
          </View>
        )}

        {/* ── Order Summary Card ── */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: "#1B4F8A",
            shadowColor: "#1B4F8A",
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              gap: 8,
            }}
          >
            <ShieldCheck size={22} color="#1B4F8A" />
            <Text style={{ fontWeight: "800", fontSize: 16, color: "#1B4F8A" }}>
              Secure Booking
            </Text>
          </View>

          {/* Total */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#6B7280", fontSize: 14 }}>
              Total Trip Cost
            </Text>
            <Text style={{ fontWeight: "700", color: "#111827", fontSize: 14 }}>
              ₹{Number(totalFare).toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Balance */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#EEF2F7",
            }}
          >
            <Text style={{ color: "#6B7280", fontSize: 14 }}>
              Balance to Driver
            </Text>
            <Text style={{ fontWeight: "700", color: "#111827", fontSize: 14 }}>
              ₹{Number(balance).toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Paying now — highlighted */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#EEF2F7",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              Paying Now
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}>
              ₹{Number(amountPaidUpfront).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* ── Payment method indicator ── */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: "#DDE3ED",
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "#EEF2F7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CreditCard size={20} color="#1B4F8A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: "#111827", fontSize: 14 }}>
              {loading
                ? "Processing..."
                : razorpayAvailable
                  ? `Pay ₹${amountPaidUpfront}`
                  : `Bypass Payment (₹${amountPaidUpfront})`}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
              {isMock
                ? "Simulated — no real charge"
                : razorpayAvailable
                  ? "UPI, Cards, Wallets & more"
                  : "Development bypass mode"}
            </Text>
          </View>
          <ShieldCheck size={18} color="#22c55e" />
        </View>

        {/* ── Cancellation note ── */}
        <Text
          style={{
            color: "#6B7280",
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: 8,
            lineHeight: 18,
            marginBottom: 24,
          }}
        >
          Free cancellation up to 24 hours before your trip start date.
        </Text>

        {/* ── Error State ── */}
        {paymentState === "failed" && errorMessage && (
          <View
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#fca5a5",
            }}
          >
            <Text
              style={{
                color: "#b91c1c",
                fontWeight: "700",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Payment Failed
            </Text>
            <Text style={{ color: "#991b1b", fontSize: 13 }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* ── Pay / Retry Button ── */}
        {paymentState === "failed" ? (
          <TouchableOpacity
            onPress={handleRetry}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              borderRadius: 14,
              backgroundColor: "#1B4F8A",
            }}
          >
            <RefreshCcw size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Try Again
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            disabled={loading}
            onPress={handlePayment}
            style={{
              paddingVertical: 17,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              backgroundColor: loading
                ? "#9CA3AF"
                : paymentState === "success"
                  ? "#16a34a"
                  : isMock
                    ? "#F59E0B"
                    : "#1B4F8A",
            }}
          >
            {paymentState === "processing" ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  Processing payment...
                </Text>
              </>
            ) : paymentState === "success" ? (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  Payment Successful!
                </Text>
              </>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {isMock
                  ? `Simulate Pay ₹${Number(amountPaidUpfront).toLocaleString("en-IN")}`
                  : `Pay ₹${Number(amountPaidUpfront).toLocaleString("en-IN")} Now`}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
