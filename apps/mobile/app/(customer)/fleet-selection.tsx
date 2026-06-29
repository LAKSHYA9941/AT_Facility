import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_INCLUSIVE_FEATURES,
  EXCLUSION_FEATURES,
  EXCLUSION_NOT_INCLUDED,
} from "../../constants/pricing";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../utils/api";

type PaymentTier = 25 | 50 | 100;
type PaymentTierKey = "pct25" | "pct50" | "pct100";

type PaymentTierBreakdown = {
  upfront: number;
  balance: number;
};

type FleetOptionTier = {
  baseFare: number;
  driverAllowance: number;
  totalFare: number;
  paymentTiers: Record<PaymentTierKey, PaymentTierBreakdown>;
};

type FleetOption = {
  segment: string;
  allInclusive: FleetOptionTier;
  exclusion: FleetOptionTier;
};

type FareEstimates = {
  days: number;
  effectiveKm: number;
  estimates: FleetOption[];
};

type Waypoint = {
  address: string;
  lat: number;
  lng: number;
};

const SEGMENT_ORDER = [
  "HATCHBACK",
  "SEDAN",
  "MINI_SUV",
  "SUV",
  "TRAVELLER",
  "URBANIA",
] as const;

const getSegmentOrder = (segment: string) => {
  const index = SEGMENT_ORDER.indexOf(
    segment as (typeof SEGMENT_ORDER)[number],
  );
  return index === -1 ? SEGMENT_ORDER.length : index;
};

const tierToKey = (tier: PaymentTier): PaymentTierKey =>
  `pct${tier}` as PaymentTierKey;

const safeParse = <T,>(value: unknown): T | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn("Failed to parse value", err);
    return null;
  }
};

const SEGMENT_IMAGES: Record<string, any> = {
  HATCHBACK: require("../../assets/images/wagonR_icon.avif"),
  SEDAN: require("../../assets/images/swift_dzire_icon.avif"),
  MINI_SUV: require("../../assets/images/ertiga_icon.avif"),
  SUV: require("../../assets/images/innova_crysta.avif"),
  TRAVELLER: require("../../assets/images/tempo_traveller.avif"),
  URBANIA: require("../../assets/images/urbania_icon.webp"),
};

export default function FleetSelectionScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();

  // Use useLocalSearchParams directly. If the bug exists where it drops on re-render,
  // we'll keep a fallback to the previous valid params.
  const [params, setParams] = useState(rawParams);
  const rawParamsStr = JSON.stringify(rawParams);

  useEffect(() => {
    if (Object.keys(rawParams).length > 0) {
      setParams(rawParams);
    }
  }, [rawParamsStr]);

  const waypoints = useMemo<Waypoint[]>(() => {
    const raw = params.waypoints;
    if (Array.isArray(raw)) {
      return raw
        .map((item) => safeParse<Waypoint>(item))
        .filter((item): item is Waypoint => !!item);
    }
    return safeParse<Waypoint[]>(raw) ?? [];
  }, [params.waypoints]);

  const fareData = useMemo<FareEstimates | null>(() => {
    const raw = params.fareEstimates;
    if (Array.isArray(raw)) return safeParse<FareEstimates>(raw[0]);
    return safeParse<FareEstimates>(raw);
  }, [params.fareEstimates]);

  const tripType =
    typeof params.tripType === "string" ? params.tripType : undefined;
  const startDate =
    typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate =
    typeof params.endDate === "string" ? params.endDate : undefined;
  const passengerCount =
    typeof params.passengerCount === "string"
      ? Number(params.passengerCount)
      : NaN;

  const fleet = useMemo<FleetOption[]>(() => {
    const defaultTiers: Record<PaymentTierKey, PaymentTierBreakdown> = {
      pct25: { upfront: 0, balance: 0 },
      pct50: { upfront: 0, balance: 0 },
      pct100: { upfront: 0, balance: 0 },
    };

    let baseEstimates = fareData?.estimates ? [...fareData.estimates] : [];

    const defaultTierBreakdown = {
      baseFare: 0,
      driverAllowance: 0,
      totalFare: 0,
      paymentTiers: defaultTiers,
    };

    const hasUrbania = baseEstimates.some((item) => item.segment === "URBANIA");
    if (!hasUrbania) {
      baseEstimates.push({
        segment: "URBANIA",
        allInclusive: defaultTierBreakdown,
        exclusion: defaultTierBreakdown,
      });
    }

    const hasTraveller = baseEstimates.some(
      (item) => item.segment === "TRAVELLER",
    );
    if (!hasTraveller) {
      baseEstimates.push({
        segment: "TRAVELLER",
        allInclusive: defaultTierBreakdown,
        exclusion: defaultTierBreakdown,
      });
    }

    if (passengerCount > 8) {
      baseEstimates = baseEstimates.filter(
        (item) => !["HATCHBACK", "SEDAN", "MINI_SUV"].includes(item.segment),
      );
    } else if (passengerCount > 4) {
      baseEstimates = baseEstimates.filter(
        (item) => !["HATCHBACK", "SEDAN"].includes(item.segment),
      );
    }

    return baseEstimates.sort(
      (a, b) => getSegmentOrder(a.segment) - getSegmentOrder(b.segment),
    );
  }, [fareData, passengerCount]);

  const [selectedSegment, setSelectedSegment] = useState<FleetOption | null>(
    null,
  );
  const [pricingTier, setPricingTier] = useState<"ALL_INCLUSIVE" | "EXCLUSION">(
    "ALL_INCLUSIVE",
  );
  const [paymentTier, setPaymentTier] = useState<PaymentTier>(25);
  const [loading, setLoading] = useState(false);
  // const { isMockMode } = useMockStore();

  const isDataInvalid =
    !tripType ||
    !startDate ||
    !endDate ||
    Number.isNaN(passengerCount) ||
    passengerCount <= 0 ||
    waypoints.length < 2 ||
    !fareData;

  useEffect(() => {
    if (Object.keys(params).length > 0 && isDataInvalid) {
      Alert.alert(
        "Missing details",
        "We couldn't load your trip details. Please start again.",
        [
          {
            text: "Okay",
            onPress: () => router.back(),
          },
        ],
      );
    }
  }, [isDataInvalid, params]);

  useEffect(() => {
    if (!selectedSegment && fleet.length > 0) {
      setSelectedSegment(fleet[0]);
    }
  }, [fleet, selectedSegment]);

  const handleProceed = async () => {
    if (!selectedSegment || isDataInvalid) return;

    if (
      selectedSegment.segment === "TRAVELLER" ||
      selectedSegment.segment === "URBANIA"
    ) {
      Alert.alert(
        "Require Bus",
        "For larger vehicles, please fill out the contact form on our website. A trip specialist will reach out to confirm availability.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Website",
            onPress: () => {
              Linking.openURL(
                "https://at-facilities.vercel.app/contact?notes=Required%20BUS",
              );
            },
          },
        ],
      );
      return;
    }

    // ── REAL MODE ──
    try {
      setLoading(true);
      const tierKey = tierToKey(paymentTier);

      const tierProp =
        pricingTier === "ALL_INCLUSIVE" ? "allInclusive" : "exclusion";

      const res = await api.post("/api/trips/create", {
        tripType,
        waypoints,
        startDate,
        endDate,
        passengerCount,
        vehicleSegment: selectedSegment.segment,
        pricingTier,
        totalFare: selectedSegment[tierProp].totalFare,
        selectedPercentage: paymentTier,
      });

      router.push({
        pathname: "/(customer)/checkout",
        params: {
          tripId: res.data.data.tripId,
          amountPaidUpfront:
            selectedSegment[tierProp].paymentTiers[tierKey].upfront.toString(),
          totalFare: selectedSegment[tierProp].totalFare.toString(),
          balance:
            selectedSegment[tierProp].paymentTiers[tierKey].balance.toString(),
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create trip",
      );
    } finally {
      setLoading(false);
    }
  };

  if (Object.keys(params).length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <TopBar title="Select Vehicle" onBack={() => router.back()} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4F8A" />
        </View>
      </SafeAreaView>
    );
  }

  if (isDataInvalid) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <TopBar title="Select Vehicle" onBack={() => router.back()} showBack />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-600 text-center mb-4">
            We couldn't load the fleet options. Please go back and try
            estimating your trip again.
          </Text>
          {/* Debugging info to help if this occurs again */}
          <Text className="text-[10px] text-gray-400 text-center">
            {`Debug: tripType=${!!tripType}, startDate=${!!startDate}, endDate=${!!endDate}, pax=${passengerCount}, waypoints=${waypoints.length}, fareData=${!!fareData}`}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pickupLabel = waypoints[0]?.address?.split(",")[0] ?? "Pickup";
  const dropLabel =
    waypoints[waypoints.length - 1]?.address?.split(",")[0] ?? "Destination";
  const tierKey = tierToKey(paymentTier);
  const tierProp =
    pricingTier === "ALL_INCLUSIVE" ? "allInclusive" : "exclusion";

  const routeDisplay =
    tripType === "ROUND_TRIP"
      ? `[Round Trip] ${waypoints.map((w) => w.address?.split(",")[0]).join(" → ")}`
      : `${pickupLabel} → ${dropLabel}`;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <TopBar title="Select Vehicle" onBack={() => router.back()} showBack />

      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-6">
          <Text className="font-semibold text-gray-800">{routeDisplay}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {new Date(startDate).toLocaleDateString()} -{" "}
            {new Date(endDate).toLocaleDateString()} • {passengerCount} Pax
          </Text>
        </View>

        <View className="flex-row bg-[#F3F4F6] rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setPricingTier("ALL_INCLUSIVE")}
            className={`flex-1 py-3 items-center rounded-lg ${
              pricingTier === "ALL_INCLUSIVE" ? "bg-white" : ""
            }`}
          >
            <Text
              className={`font-bold text-sm ${pricingTier === "ALL_INCLUSIVE" ? "text-[#1B4F8A]" : "text-gray-500"}`}
            >
              All-Inclusive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPricingTier("EXCLUSION")}
            className={`flex-1 py-3 items-center rounded-lg ${
              pricingTier === "EXCLUSION" ? "bg-white" : ""
            }`}
          >
            <Text
              className={`font-bold text-sm ${pricingTier === "EXCLUSION" ? "text-[#1B4F8A]" : "text-gray-500"}`}
            >
              Exclusion
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {fleet.map((vehicle) => {
            const isSelected = selectedSegment?.segment === vehicle.segment;
            const showOnRequest =
              vehicle.segment === "TRAVELLER" || vehicle.segment === "URBANIA";

            return (
              <TouchableOpacity
                key={vehicle.segment}
                onPress={() => setSelectedSegment(vehicle)}
                style={{
                  width: 144,
                  backgroundColor: isSelected ? "#EFF6FF" : "#fff",
                  marginRight: 16,
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? "#1B4F8A" : "transparent",
                }}
              >
                {isSelected && (
                  <View style={{ position: "absolute", top: 8, right: 8 }}>
                    <CheckCircle2 size={20} color="#1B4F8A" />
                  </View>
                )}
                <View
                  style={{
                    height: 64,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 8,
                    marginBottom: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {SEGMENT_IMAGES[vehicle.segment] ? (
                    <Image
                      source={SEGMENT_IMAGES[vehicle.segment]}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                      Image
                    </Text>
                  )}
                </View>
                <Text style={{ fontWeight: "bold", color: "#1f2937" }}>
                  {vehicle.segment}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {showOnRequest
                    ? "Available on request"
                    : `₹${vehicle[tierProp].totalFare}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedSegment && fareData && (
          <View className="bg-white p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-3">
              Fare Breakdown
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">
                Base Fare ({fareData.effectiveKm} km min)
              </Text>
              <Text className="font-semibold">
                {selectedSegment.segment === "TRAVELLER" ||
                selectedSegment.segment === "URBANIA"
                  ? "—"
                  : `₹${selectedSegment[tierProp].baseFare}`}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">
                Driver Allowance ({fareData.days} days)
              </Text>
              <Text className="font-semibold">
                {selectedSegment.segment === "TRAVELLER" ||
                selectedSegment.segment === "URBANIA"
                  ? "—"
                  : `₹${selectedSegment[tierProp].driverAllowance}`}
              </Text>
            </View>
            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
              <Text className="font-bold text-lg text-gray-800">
                Total Fare
              </Text>
              <Text className="font-bold text-lg text-brand-primary">
                {selectedSegment.segment === "TRAVELLER" ||
                selectedSegment.segment === "URBANIA"
                  ? "Available on request"
                  : `₹${selectedSegment[tierProp].totalFare}`}
              </Text>
            </View>

            {/* Feature Checklists */}
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="font-bold text-sm text-gray-800 mb-2">
                What's Included
              </Text>
              {(pricingTier === "ALL_INCLUSIVE"
                ? ALL_INCLUSIVE_FEATURES
                : EXCLUSION_FEATURES
              ).map((feature, i) => (
                <View key={i} className="flex-row items-center mb-1.5">
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text className="text-xs text-gray-600 ml-2">{feature}</Text>
                </View>
              ))}

              {pricingTier === "EXCLUSION" && (
                <View className="mt-2">
                  <Text className="font-bold text-sm text-gray-800 mb-2">
                    Not Included
                  </Text>
                  {EXCLUSION_NOT_INCLUDED.map((feature, i) => (
                    <View key={i} className="flex-row items-center mb-1.5">
                      <XCircle size={14} color="#EF4444" />
                      <Text className="text-xs text-gray-400 ml-2 line-through">
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {selectedSegment && (
          <View className="mb-10">
            <Text className="font-bold text-gray-800 mb-3 ml-1">
              Payment Option
            </Text>
            <View className="flex-row bg-gray-200 rounded-full p-1 mb-2">
              {[25, 50, 100].map((tier) => {
                const tierKeyOption = tierToKey(tier as PaymentTier);
                const disabledTier =
                  selectedSegment.segment === "TRAVELLER" ||
                  selectedSegment.segment === "URBANIA";
                const upfront =
                  selectedSegment[tierProp].paymentTiers?.[tierKeyOption]
                    ?.upfront ?? 0;
                const isActive = paymentTier === tier;

                return (
                  <TouchableOpacity
                    key={tier}
                    onPress={() =>
                      !disabledTier && setPaymentTier(tier as PaymentTier)
                    }
                    disabled={disabledTier}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: "center",
                      borderRadius: 999,
                      backgroundColor: isActive ? "#fff" : "transparent",
                      opacity: disabledTier ? 0.6 : 1,
                      ...(isActive
                        ? {
                            shadowColor: "#000",
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }
                        : {}),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: isActive ? "#1B4F8A" : "#4b5563",
                      }}
                    >
                      Pay {tier}%
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: isActive ? "#1B4F8A" : "#6b7280",
                      }}
                    >
                      {disabledTier ? "—" : `₹${upfront}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs text-gray-500 text-center">
              {selectedSegment.segment === "TRAVELLER" ||
              selectedSegment.segment === "URBANIA"
                ? "Our team will confirm availability and pricing manually."
                : `Balance of ₹${selectedSegment[tierProp].paymentTiers?.[tierKey]?.balance ?? 0} paid directly to driver during trip.`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          disabled={!selectedSegment || loading}
          onPress={handleProceed}
          className={`py-4 rounded-xl items-center mb-10 ${!selectedSegment || loading ? "bg-gray-300" : "bg-brand-primary"}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Proceed to Pay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardImage: {
    width: "100%",
    height: "100%",
  },
});
