import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { api } from "../../utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/auth";
import RazorpayCheckout from "react-native-razorpay";
import { Check, X } from "lucide-react-native";

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "";

const CAR_TYPES = ["HATCHBACK", "SEDAN", "MINI_SUV", "SUV", "TEMPO"] as const;
type CarType = (typeof CAR_TYPES)[number];

const CAR_LABELS: Record<CarType, string> = {
  HATCHBACK: "Hatchback\n₹11/km",
  SEDAN: "Sedan\n₹12/km",
  MINI_SUV: "Mini SUV\n₹14/km",
  SUV: "SUV\n₹16/km",
  TEMPO: "Tempo\n₹25/km",
};

type FormState = {
  pickupLocation: string;
  destinations: string[];
  numberOfTravellers: number;
  budgetMin: number;
  budgetMax: number;
  carType: CarType | null;
  hotelRequired: boolean | null;
  additionalNotes: string;
};

const INITIAL_FORM: FormState = {
  pickupLocation: "",
  destinations: [],
  numberOfTravellers: 2,
  budgetMin: 3000,
  budgetMax: 15000,
  carType: null,
  hotelRequired: null,
  additionalNotes: "",
};

// ── Shared Tailwind Classes ──────────────────────────────────────────────────
const labelStyle = "text-[13px] font-semibold text-gray-700 mb-1.5";
const inputStyle =
  "bg-brand-bg rounded-xl p-3 text-sm text-gray-900 border-[0.5px] border-brand-border mb-1";
const counterBtn =
  "w-10 h-10 rounded-full bg-brand-bg items-center justify-center border-[0.5px] border-brand-border";
const counterBtnText = "text-xl text-brand-primary font-bold";

// ── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 self-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${
            i === step ? "w-5 bg-brand-primary" : "w-2 bg-brand-border"
          }`}
          style={{ transitionDuration: "200ms" }}
        />
      ))}
    </View>
  );
}

// ── Budget display ───────────────────────────────────────────────────────────
function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CustomPlanScreen() {
  const [tab, setTab] = useState<"MY_PLANS" | "NEW_PLAN">("MY_PLANS");
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  // My Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  // Form State
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [destInput, setDestInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = 3;

  const fetchMyPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const res = await api.get("/api/custom-plans/my");
      setPlans(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to fetch my plans", err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "MY_PLANS") {
      fetchMyPlans();
    }
  }, [tab, fetchMyPlans]);

  const handlePayment = async (planId: string, amount: number) => {
    setPayingPlanId(planId);
    try {
      // Create order
      const orderRes = await api.post(
        "/api/payments/create-custom-plan-order",
        {
          planId,
        },
      );
      const { orderId, amount: amountPaise, currency } = orderRes.data.data;

      const razorpayOptions = {
        description: "At Facility Custom Plan Payment",
        image: "",
        currency: currency ?? "INR",
        key: RAZORPAY_KEY,
        amount: String(amountPaise),
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

      // Verify payment
      const verifyRes = await api.post("/api/payments/verify-custom-plan", {
        planId,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      if (verifyRes.data.success) {
        Alert.alert(
          "Success",
          "Payment successful! Your custom plan is accepted.",
        );
        fetchMyPlans();
      } else {
        throw new Error("Verification failed");
      }
    } catch (e: any) {
      if (
        e?.code === "PAYMENT_CANCELLED" ||
        e?.description === "Cancelled by user"
      ) {
        return;
      }
      Alert.alert(
        "Payment Failed",
        e.response?.data?.message ??
          e.message ??
          "Payment could not be completed",
      );
    } finally {
      setPayingPlanId(null);
    }
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addDestination = () => {
    const val = destInput.trim();
    if (!val || form.destinations.includes(val)) return;
    update("destinations", [...form.destinations, val]);
    setDestInput("");
  };

  const removeDestination = (dest: string) => {
    update(
      "destinations",
      form.destinations.filter((d) => d !== dest),
    );
  };

  const canProceedStep0 =
    form.pickupLocation.trim().length >= 2 && form.destinations.length >= 1;

  const canProceedStep1 =
    form.budgetMin > 0 &&
    form.budgetMax >= form.budgetMin &&
    form.carType !== null &&
    form.hotelRequired !== null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/custom-plans", {
        pickupLocation: form.pickupLocation,
        destinations: form.destinations,
        numberOfTravellers: form.numberOfTravellers,
        budgetMin: form.budgetMin,
        budgetMax: form.budgetMax,
        carType: form.carType,
        hotelRequired: form.hotelRequired,
        additionalNotes: form.additionalNotes || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Error", "Failed to submit your plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View
        className="flex-1 bg-gray-50 items-center justify-center p-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View className="w-18 h-18 rounded-full bg-green-100 items-center justify-center self-center mb-5">
            <Check size={36} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
            Plan submitted!
          </Text>
          <Text className="text-base text-gray-400 text-center leading-6">
            Our team will review your plan and contact you on your registered
            number shortly.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSubmitted(false);
              setTab("MY_PLANS");
              setStep(0);
              setForm(INITIAL_FORM);
              fetchMyPlans();
            }}
            className="mt-7 bg-brand-primary rounded-xl p-3.5 items-center"
          >
            <Text className="text-white font-bold text-[15px]">
              View My Plans
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b-[0.5px] border-brand-border">
        <TouchableOpacity
          onPress={() =>
            tab === "NEW_PLAN" && step > 0 ? setStep(step - 1) : router.back()
          }
          className="mr-3"
        >
          <Text className="text-[22px] text-brand-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-gray-900">
          Custom Plans
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b-[0.5px] border-brand-border p-2">
        <TouchableOpacity
          onPress={() => setTab("MY_PLANS")}
          className={`flex-1 p-2 items-center rounded-lg ${
            tab === "MY_PLANS" ? "bg-brand-bg border border-brand-border" : ""
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              tab === "MY_PLANS" ? "text-brand-primary" : "text-gray-500"
            }`}
          >
            My Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("NEW_PLAN")}
          className={`flex-1 p-2 items-center rounded-lg ${
            tab === "NEW_PLAN" ? "bg-brand-bg border border-brand-border" : ""
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              tab === "NEW_PLAN" ? "text-brand-primary" : "text-gray-500"
            }`}
          >
            New Plan
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "MY_PLANS" ? (
        <View className="flex-1">
          {loadingPlans ? (
            <ActivityIndicator color="#1B4F8A" className="mt-10" />
          ) : plans.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-gray-400 text-center text-[15px]">
                You haven't submitted any custom plans yet.
              </Text>
              <TouchableOpacity
                onPress={() => setTab("NEW_PLAN")}
                className="mt-4 bg-brand-primary px-6 py-2.5 rounded-xl"
              >
                <Text className="text-white font-bold">Create New Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={plans}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <View className="bg-white rounded-xl p-4 border-[0.5px] border-brand-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-bold text-gray-900 text-[15px] flex-1 mr-2">
                      {item.pickupLocation} → {item.destinations.join(", ")}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-md ${
                        item.status === "QUOTED"
                          ? "bg-indigo-100"
                          : item.status === "ACCEPTED"
                            ? "bg-green-100"
                            : item.status === "REJECTED"
                              ? "bg-red-100"
                              : "bg-blue-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          item.status === "QUOTED"
                            ? "text-indigo-800"
                            : item.status === "ACCEPTED"
                              ? "text-green-800"
                              : item.status === "REJECTED"
                                ? "text-red-800"
                                : "text-blue-800"
                        }`}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[13px] text-gray-500 mb-3">
                    Travellers: {item.numberOfTravellers} • Budget:{" "}
                    {formatINR(item.budgetMin)} - {formatINR(item.budgetMax)}
                  </Text>

                  {item.status === "QUOTED" && item.quotedAmount && (
                    <View className="bg-brand-bg rounded-lg p-3 border border-brand-border items-center">
                      <Text className="text-[13px] text-gray-600 mb-1">
                        We've offered a great deal!
                      </Text>
                      <Text className="text-[17px] font-bold text-brand-primary mb-3">
                        Total: ₹{item.quotedAmount.toLocaleString("en-IN")}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          handlePayment(item.id, item.quotedAmount)
                        }
                        disabled={payingPlanId === item.id}
                        className="bg-brand-primary w-full p-3 rounded-lg items-center flex-row justify-center"
                      >
                        {payingPlanId === item.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text className="text-white font-bold text-sm">
                            Accept & Pay ₹
                            {item.quotedAmount.toLocaleString("en-IN")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {item.status === "ACCEPTED" && (
                    <View className="bg-green-50 p-3 rounded-lg border border-green-200 mt-2">
                      <Text className="text-green-800 font-semibold text-sm">
                        Payment Successful! We will assign a driver soon.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <StepDots step={step} total={totalSteps} />

          {/* ── Step 0: Where ─────────────────────────────────────────────── */}
          {step === 0 && (
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <Text className="text-[22px] font-bold text-gray-900 mb-1">
                Where are you going?
              </Text>
              <Text className="text-sm text-gray-400 mb-5">
                Enter your pickup and destinations
              </Text>

              <Text className={labelStyle}>Pickup location</Text>
              <TextInput
                value={form.pickupLocation}
                onChangeText={(v) => update("pickupLocation", v)}
                placeholder="e.g. New Delhi"
                placeholderTextColor="#9CA3AF"
                className={inputStyle}
              />

              <Text className={`${labelStyle} mt-4`}>Add destinations</Text>
              <View className="flex-row gap-2 mb-2.5">
                <TextInput
                  value={destInput}
                  onChangeText={setDestInput}
                  onSubmitEditing={addDestination}
                  returnKeyType="done"
                  placeholder="e.g. Manali"
                  placeholderTextColor="#9CA3AF"
                  className={`${inputStyle} flex-1 mb-0`}
                />
                <TouchableOpacity
                  onPress={addDestination}
                  className="bg-brand-primary rounded-[10px] px-4 items-center justify-center"
                >
                  <Text className="text-white text-xl font-bold">+</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {form.destinations.map((dest) => (
                  <TouchableOpacity
                    key={dest}
                    onPress={() => removeDestination(dest)}
                    className="bg-brand-primary rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
                  >
                    <Text className="text-white text-[13px] font-semibold">
                      {dest}
                    </Text>
                    <X size={10} color="#93C5FD" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text className={`${labelStyle} mt-2`}>
                Number of travellers: {form.numberOfTravellers}
              </Text>
              <View className="flex-row items-center gap-4 mb-2">
                <TouchableOpacity
                  onPress={() =>
                    update(
                      "numberOfTravellers",
                      Math.max(1, form.numberOfTravellers - 1),
                    )
                  }
                  className={counterBtn}
                >
                  <Text className={counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text className="text-[22px] font-bold text-gray-900 min-w-[32px] text-center">
                  {form.numberOfTravellers}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    update(
                      "numberOfTravellers",
                      Math.min(50, form.numberOfTravellers + 1),
                    )
                  }
                  className={counterBtn}
                >
                  <Text className={counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── Step 1: Preferences ──────────────────────────────────────── */}
          {step === 1 && (
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <Text className="text-[22px] font-bold text-gray-900 mb-1">
                Your preferences
              </Text>
              <Text className="text-sm text-gray-400 mb-5">
                Help us find the right option for you
              </Text>

              {/* Budget */}
              <Text className={labelStyle}>
                Budget range: {formatINR(form.budgetMin)} –{" "}
                {formatINR(form.budgetMax)}
              </Text>
              <View className="gap-2 mb-4">
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xs text-gray-400 w-[30px]">Min</Text>
                  <TextInput
                    value={String(form.budgetMin)}
                    onChangeText={(v) => update("budgetMin", parseInt(v) || 0)}
                    keyboardType="number-pad"
                    className={`${inputStyle} flex-1 mb-0`}
                    placeholder="e.g. 3000"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xs text-gray-400 w-[30px]">Max</Text>
                  <TextInput
                    value={String(form.budgetMax)}
                    onChangeText={(v) => update("budgetMax", parseInt(v) || 0)}
                    keyboardType="number-pad"
                    className={`${inputStyle} flex-1 mb-0`}
                    placeholder="e.g. 15000"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Car type */}
              <Text className={`${labelStyle} mt-2 mb-2.5`}>Car type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <View className="flex-row gap-2.5">
                  {CAR_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => update("carType", type)}
                      className={`w-[90px] p-3 rounded-xl items-center border ${
                        form.carType === type
                          ? "bg-brand-primary border-brand-primary"
                          : "bg-white border-brand-border"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold text-center ${
                          form.carType === type ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {CAR_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Hotel */}
              <Text className={`${labelStyle} mb-2.5`}>Hotel needed?</Text>
              <View className="flex-row gap-3 mb-4">
                {[true, false].map((val) => (
                  <TouchableOpacity
                    key={String(val)}
                    onPress={() => update("hotelRequired", val)}
                    className={`flex-1 p-3.5 rounded-xl items-center border ${
                      form.hotelRequired === val
                        ? "bg-brand-primary border-brand-primary"
                        : "bg-white border-brand-border"
                    }`}
                  >
                    <Text
                      className={`text-[15px] font-bold ${
                        form.hotelRequired === val
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {val ? "Yes" : "No"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Step 2: Review & Submit ──────────────────────────────────── */}
          {step === 2 && (
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <Text className="text-[22px] font-bold text-gray-900 mb-1">
                Review your plan
              </Text>
              <Text className="text-sm text-gray-400 mb-5">
                Looks good? We'll reach out on your registered number.
              </Text>

              <View className="bg-white rounded-xl border-[0.5px] border-brand-border p-4 gap-3 mb-4">
                {[
                  { label: "Pickup", value: form.pickupLocation },
                  {
                    label: "Destinations",
                    value: form.destinations.join(" → ") || "—",
                  },
                  {
                    label: "Travellers",
                    value: String(form.numberOfTravellers),
                  },
                  {
                    label: "Budget",
                    value: `${formatINR(form.budgetMin)} – ${formatINR(
                      form.budgetMax,
                    )}`,
                  },
                  { label: "Car type", value: form.carType ?? "Any" },
                  { label: "Hotel", value: form.hotelRequired ? "Yes" : "No" },
                ].map(({ label, value }) => (
                  <View key={label} className="flex-row justify-between">
                    <Text className="text-sm text-gray-400">{label}</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className={labelStyle}>Additional notes (optional)</Text>
              <TextInput
                value={form.additionalNotes}
                onChangeText={(v) => update("additionalNotes", v)}
                multiline
                numberOfLines={3}
                placeholder="Any special requirements, preferred routes, etc."
                placeholderTextColor="#9CA3AF"
                className={`${inputStyle} min-h-[80px] text-left`}
                style={{ textAlignVertical: "top" }}
              />
            </Animated.View>
          )}

          {/* Navigation buttons */}
          <View className="mt-6 gap-2.5">
            {step < totalSteps - 1 ? (
              <TouchableOpacity
                onPress={() => setStep(step + 1)}
                disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
                className={`rounded-xl p-3.5 items-center ${
                  (step === 0 ? !canProceedStep0 : !canProceedStep1)
                    ? "bg-brand-border"
                    : "bg-brand-primary"
                }`}
              >
                <Text
                  className={`font-bold text-[15px] ${
                    (step === 0 ? !canProceedStep0 : !canProceedStep1)
                      ? "text-gray-400"
                      : "text-white"
                  }`}
                >
                  Continue →
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-brand-primary rounded-xl p-3.5 items-center"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-[15px]">
                    Submit Plan
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
