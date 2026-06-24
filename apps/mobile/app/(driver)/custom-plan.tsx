// apps/mobile/app/(driver)/custom-plan.tsx

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
import {
  Check,
  X,
  MapPin,
  Settings2,
  FileText,
  ArrowLeft,
  Briefcase,
} from "lucide-react-native";

const CAR_TYPES = ["HATCHBACK", "SEDAN", "MINI_SUV", "SUV", "TEMPO"] as const;
type CarType = (typeof CAR_TYPES)[number];

const CAR_LABELS: Record<CarType, string> = {
  HATCHBACK: "Hatchback\n₹11/km",
  SEDAN: "Sedan\n₹12/km",
  MINI_SUV: "Mini SUV\n₹14/km",
  SUV: "SUV\n₹16/km",
  TEMPO: "Tempo\n₹25/km",
};

const HOTEL_TYPES = [
  { value: "BUDGET", label: "Budget Rooms" },
  { value: "STANDARD", label: "Standard Rooms" },
  { value: "COMFORT_SUITE", label: "Comfort Suite" },
  { value: "DELUXE", label: "Deluxe Rooms" },
  { value: "LUXURY", label: "Luxury Rooms" },
] as const;
type HotelType = (typeof HOTEL_TYPES)[number]["value"];

type FormState = {
  pickupLocation: string;
  destinations: string[];
  numberOfTravellers: number;
  budget: number;
  carType: CarType | null;
  hotelRequired: boolean;
  hotelType: HotelType | null;
  additionalNotes: string;
};

const INITIAL_FORM: FormState = {
  pickupLocation: "",
  destinations: [],
  numberOfTravellers: 2,
  budget: 0,
  carType: null,
  hotelRequired: false,
  hotelType: null,
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
          className={`h-2 rounded-full ${i === step ? "w-5 bg-brand-primary" : "w-2 bg-brand-border"}`}
        />
      ))}
    </View>
  );
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  tab,
  setTab,
}: {
  tab: "MY_PLANS" | "NEW_PLAN" | "ASSIGNED_JOBS";
  setTab: (t: "MY_PLANS" | "NEW_PLAN" | "ASSIGNED_JOBS") => void;
}) {
  return (
    <View className="flex-row mx-4 my-2 bg-brand-bg rounded-xl p-1 border-[0.5px] border-brand-border">
      {(["MY_PLANS", "ASSIGNED_JOBS", "NEW_PLAN"] as const).map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => setTab(t)}
          className={`flex-1 py-2 rounded-lg items-center ${tab === t ? "bg-brand-primary" : ""}`}
        >
          <Text
            className={`text-sm font-bold ${tab === t ? "text-white" : "text-gray-600"}`}
          >
            {t === "MY_PLANS"
              ? "My Plans"
              : t === "ASSIGNED_JOBS"
                ? "Assigned"
                : "New"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CustomPlanScreen() {
  const [tab, setTab] = useState<"MY_PLANS" | "NEW_PLAN" | "ASSIGNED_JOBS">(
    "MY_PLANS",
  );
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [destInput, setDestInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [assignedJobs, setAssignedJobs] = useState<any[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

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

  const fetchAssignedJobs = useCallback(async () => {
    try {
      setLoadingAssigned(true);
      const res = await api.get("/api/custom-plans/assigned-to-me");
      setAssignedJobs(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to fetch assigned jobs", err);
    } finally {
      setLoadingAssigned(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "MY_PLANS") fetchMyPlans();
    if (tab === "ASSIGNED_JOBS") fetchAssignedJobs();
  }, [tab, fetchMyPlans, fetchAssignedJobs]);

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
    form.budget > 0 &&
    form.carType !== null &&
    (!form.hotelRequired || form.hotelType !== null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/custom-plans", {
        pickupLocation: form.pickupLocation,
        destinations: form.destinations,
        numberOfTravellers: form.numberOfTravellers,
        budgetMin: form.budget,
        budgetMax: form.budget,
        carType: form.carType,
        hotelRequired: form.hotelRequired,
        hotelType: form.hotelType,
        additionalNotes: form.additionalNotes || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Error", "Failed to submit your plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────

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
              setForm(INITIAL_FORM);
              setStep(0);
              setTab("MY_PLANS");
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
          onPress={() => {
            if (tab === "NEW_PLAN" && step > 0) setStep(step - 1);
            else router.back();
          }}
          className="mr-3 p-1"
        >
          <ArrowLeft size={22} color="#1B4F8A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-gray-900">
          Custom Plans
        </Text>
      </View>

      <TabBar tab={tab} setTab={setTab} />

      {/* ── MY PLANS TAB ──────────────────────────────────────────────────── */}
      {tab === "MY_PLANS" ? (
        <View className="flex-1">
          {loadingPlans ? (
            <ActivityIndicator color="#1B4F8A" className="mt-10" />
          ) : plans.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6">
              <Briefcase
                size={40}
                color="#D1D5DB"
                style={{ marginBottom: 12 }}
              />
              <Text className="text-gray-400 text-center text-[15px]">
                You haven't submitted any plans yet.
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
                    Travellers: {item.numberOfTravellers} · Budget:{" "}
                    {formatINR(item.budgetMin)}
                  </Text>

                  {/* Earnings card — only when accepted and driver earning is set */}
                  {item.status === "ACCEPTED" && item.driverEarning != null && (
                    <View className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex-row items-center gap-3">
                      <Check size={20} color="#16a34a" />
                      <View className="flex-1">
                        <Text className="text-green-800 font-bold text-[13px]">
                          Job Accepted — Your Earnings
                        </Text>
                        <Text className="text-green-700 font-bold text-[20px]">
                          {formatINR(item.driverEarning)}
                        </Text>
                        <Text className="text-green-600 text-[11px] mt-0.5">
                          A driver has been assigned to fulfil this job.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      ) : tab === "ASSIGNED_JOBS" ? (
        /* ── ASSIGNED JOBS TAB ─────────────────────────────────────────────── */
        <View className="flex-1">
          {loadingAssigned ? (
            <ActivityIndicator color="#1B4F8A" className="mt-10" />
          ) : assignedJobs.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6">
              <Briefcase
                size={40}
                color="#D1D5DB"
                style={{ marginBottom: 12 }}
              />
              <Text className="text-gray-400 text-center text-[15px]">
                You have no jobs assigned by the admin yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={assignedJobs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <View className="bg-white rounded-xl p-4 border-[0.5px] border-brand-border shadow-sm">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-bold text-gray-900 text-[15px] flex-1 mr-2">
                      {item.pickupLocation} → {item.destinations.join(", ")}
                    </Text>
                    <View className="px-2 py-1 rounded-md bg-blue-100">
                      <Text className="text-xs font-bold text-blue-800">
                        ASSIGNED TO YOU
                      </Text>
                    </View>
                  </View>

                  <View className="bg-gray-50 p-3 rounded-lg mb-3">
                    <Text className="text-sm text-gray-700 font-semibold mb-1">
                      Customer Info
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {item.user.name ?? "Unknown"} • {item.user.phone}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2 mb-3">
                    <View className="bg-brand-bg px-2 py-1.5 rounded-md">
                      <Text className="text-xs text-gray-700">
                        Pax: {item.numberOfTravellers}
                      </Text>
                    </View>
                    <View className="bg-brand-bg px-2 py-1.5 rounded-md">
                      <Text className="text-xs text-gray-700">
                        Car: {item.carType ?? "Any"}
                      </Text>
                    </View>
                    {item.hotelRequired && (
                      <View className="bg-brand-bg px-2 py-1.5 rounded-md">
                        <Text className="text-xs text-gray-700">
                          Hotel:{" "}
                          {HOTEL_TYPES.find((h) => h.value === item.hotelType)
                            ?.label ?? "Yes"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {item.additionalNotes && (
                    <View className="mb-3">
                      <Text className="text-[12px] text-gray-400 mb-0.5">
                        Notes
                      </Text>
                      <Text className="text-[13px] text-gray-700">
                        {item.additionalNotes}
                      </Text>
                    </View>
                  )}

                  <View className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex-row justify-between items-center mt-2">
                    <Text className="text-green-800 font-bold text-[14px]">
                      Your Job Earnings
                    </Text>
                    <Text className="text-green-700 font-bold text-[20px]">
                      {formatINR(item.driverEarning ?? 0)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        /* ── NEW PLAN TAB ──────────────────────────────────────────────────── */
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <StepDots step={step} total={totalSteps} />

          {/* ── Step 0: Where ──────────────────────────────────────────────── */}
          {step === 0 && (
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <View className="flex-row items-center gap-2 mb-1">
                <MapPin size={24} color="#111827" />
                <Text className="text-[22px] font-bold text-gray-900">
                  Where are you going?
                </Text>
              </View>
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
              <View className="flex-row items-center gap-2 mb-1">
                <Settings2 size={24} color="#111827" />
                <Text className="text-[22px] font-bold text-gray-900">
                  Your preferences
                </Text>
              </View>
              <Text className="text-sm text-gray-400 mb-5">
                Help us find the right option for you
              </Text>

              {/* Budget — single fixed amount for drivers */}
              <Text className={labelStyle}>
                Job budget: {form.budget > 0 ? formatINR(form.budget) : "—"}
              </Text>
              <TextInput
                value={form.budget > 0 ? String(form.budget) : ""}
                onChangeText={(v) => update("budget", parseInt(v) || 0)}
                keyboardType="number-pad"
                className={`${inputStyle} mb-4`}
                placeholder="Enter fixed job amount (e.g. 8000)"
                placeholderTextColor="#9CA3AF"
              />

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
                        className={`text-[11px] font-bold text-center ${form.carType === type ? "text-white" : "text-gray-700"}`}
                      >
                        {CAR_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Hotel */}
              <Text className={`${labelStyle} mb-2.5`}>Hotel needed?</Text>
              <View className="flex-row gap-3 mb-3">
                {([true, false] as const).map((val) => (
                  <TouchableOpacity
                    key={String(val)}
                    onPress={() => {
                      update("hotelRequired", val);
                      if (!val) update("hotelType", null);
                    }}
                    className={`flex-1 p-3.5 rounded-xl items-center border ${
                      form.hotelRequired === val
                        ? "bg-brand-primary border-brand-primary"
                        : "bg-white border-brand-border"
                    }`}
                  >
                    <Text
                      className={`text-[15px] font-bold ${form.hotelRequired === val ? "text-white" : "text-gray-700"}`}
                    >
                      {val ? "Yes" : "No"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hotel type picker */}
              {form.hotelRequired && (
                <View className="mb-4">
                  <Text className={`${labelStyle} mb-2`}>
                    Type of hotel room
                  </Text>
                  <View className="gap-2">
                    {HOTEL_TYPES.map((ht) => (
                      <TouchableOpacity
                        key={ht.value}
                        onPress={() => update("hotelType", ht.value)}
                        className={`flex-row items-center p-3 rounded-xl border ${
                          form.hotelType === ht.value
                            ? "bg-brand-primary border-brand-primary"
                            : "bg-white border-brand-border"
                        }`}
                      >
                        <View
                          className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                            form.hotelType === ht.value
                              ? "border-white"
                              : "border-brand-border"
                          }`}
                        >
                          {form.hotelType === ht.value && (
                            <View className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </View>
                        <Text
                          className={`text-[14px] font-semibold ${
                            form.hotelType === ht.value
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          {ht.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Step 2: Review & Submit ───────────────────────────────────── */}
          {step === 2 && (
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <View className="flex-row items-center gap-2 mb-1">
                <FileText size={24} color="#111827" />
                <Text className="text-[22px] font-bold text-gray-900">
                  Review your plan
                </Text>
              </View>
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
                  { label: "Job Budget", value: formatINR(form.budget) },
                  { label: "Car type", value: form.carType ?? "Any" },
                  {
                    label: "Hotel",
                    value: form.hotelRequired
                      ? `Yes – ${HOTEL_TYPES.find((h) => h.value === form.hotelType)?.label ?? ""}`
                      : "No",
                  },
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
