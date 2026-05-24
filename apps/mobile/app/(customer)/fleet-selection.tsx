import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/layout/TopBar";
// import { useMockStore } from "../../store/mock";
import { api } from "../../utils/api";

type PaymentTier = 25 | 50 | 100;
type PaymentTierKey = "pct25" | "pct50" | "pct100";

type PaymentTierBreakdown = {
  upfront: number;
  balance: number;
};

type FleetOption = {
  segment: string;
  baseFare: number;
  driverAllowance: number;
  totalFare: number;
  paymentTiers: Record<PaymentTierKey, PaymentTierBreakdown>;
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
  "TEMPO",
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
  TEMPO: require("../../assets/images/tempo_traveller.avif"),
  URBANIA: require("../../assets/images/urbania_icon.webp"),
};

export default function FleetSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

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

    const baseEstimates = fareData?.estimates ? [...fareData.estimates] : [];

    const hasUrbania = baseEstimates.some((item) => item.segment === "URBANIA");
    if (!hasUrbania) {
      baseEstimates.push({
        segment: "URBANIA",
        baseFare: 0,
        driverAllowance: 0,
        totalFare: 0,
        paymentTiers: defaultTiers,
      });
    }

    return baseEstimates.sort(
      (a, b) => getSegmentOrder(a.segment) - getSegmentOrder(b.segment),
    );
  }, [fareData]);

  const [selectedSegment, setSelectedSegment] = useState<FleetOption | null>(
    null,
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
    if (isDataInvalid) {
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
  }, [isDataInvalid]);

  useEffect(() => {
    if (!selectedSegment && fleet.length > 0) {
      setSelectedSegment(fleet[0]);
    }
  }, [fleet, selectedSegment]);

  const handleProceed = async () => {
    if (!selectedSegment || isDataInvalid) return;

    if (
      selectedSegment.segment === "TEMPO" ||
      selectedSegment.segment === "URBANIA"
    ) {
      Alert.alert(
        "Request Received",
        "A trip specialist will reach out to confirm availability and pricing for this vehicle.",
      );
      return;
    }

    // // ── MOCK MODE: skip API, generate fake trip ID ──
    // if (isMockMode) {
    //   setLoading(true);
    //   const tierKey = tierToKey(paymentTier);
    //   await new Promise((r) => setTimeout(r, 800)); // simulate DB lag
    //   const mockTripId = `mock-trip-${Date.now()}`;
    //   setLoading(false);
    //   router.push({
    //     pathname: "/(customer)/checkout",
    //     params: {
    //       tripId: mockTripId,
    //       amountPaidUpfront:
    //         selectedSegment.paymentTiers[tierKey].upfront.toString(),
    //       totalFare: selectedSegment.totalFare.toString(),
    //       balance: selectedSegment.paymentTiers[tierKey].balance.toString(),
    //       vehicleSegment: selectedSegment.segment,
    //       waypoints:
    //         typeof waypoints === "string"
    //           ? waypoints
    //           : JSON.stringify(waypoints),
    //       startDate: startDate ?? "",
    //       endDate: endDate ?? "",
    //       passengerCount: passengerCount.toString(),
    //     },
    //   });
    //   return;
    // }

    // ── REAL MODE ──
    try {
      setLoading(true);
      const tierKey = tierToKey(paymentTier);

      const res = await api.post("/api/trips/create", {
        tripType,
        waypoints,
        startDate,
        endDate,
        passengerCount,
        vehicleSegment: selectedSegment.segment,
        totalFare: selectedSegment.totalFare,
        selectedPercentage: paymentTier,
      });

      router.push({
        pathname: "/(customer)/checkout",
        params: {
          tripId: res.data.data.tripId,
          amountPaidUpfront:
            selectedSegment.paymentTiers[tierKey].upfront.toString(),
          totalFare: selectedSegment.totalFare.toString(),
          balance: selectedSegment.paymentTiers[tierKey].balance.toString(),
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

  if (isDataInvalid) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <TopBar title="Select Vehicle" onBack={() => router.back()} showBack />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-600 text-center">
            We couldn't load the fleet options. Please go back and try
            estimating your trip again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pickupLabel = waypoints[0]?.address?.split(",")[0] ?? "Pickup";
  const dropLabel =
    waypoints[waypoints.length - 1]?.address?.split(",")[0] ?? "Destination";
  const tierKey = tierToKey(paymentTier);

  const routeDisplay =
    tripType === "ROUND_TRIP"
      ? `🔄 ${waypoints.map((w) => w.address?.split(",")[0]).join(" → ")}`
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {fleet.map((vehicle) => {
            const isSelected = selectedSegment?.segment === vehicle.segment;
            const showOnRequest =
              vehicle.segment === "TEMPO" || vehicle.segment === "URBANIA";

            return (
              <TouchableOpacity
                key={vehicle.segment}
                onPress={() => setSelectedSegment(vehicle)}
                className={`w-36 bg-white mr-4 p-4 rounded-2xl border-2 ${isSelected ? "border-brand-primary bg-blue-50" : "border-transparent"}`}
              >
                {isSelected && (
                  <View className="absolute top-2 right-2">
                    <CheckCircle2 size={20} color="#1B4F8A" />
                  </View>
                )}
                <View className="h-16 bg-gray-100 rounded-lg mb-3 items-center justify-center overflow-hidden">
                  {SEGMENT_IMAGES[vehicle.segment] ? (
                    <Image
                      source={SEGMENT_IMAGES[vehicle.segment]}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-xs text-gray-400">Image</Text>
                  )}
                </View>
                <Text className="font-bold text-gray-800">
                  {vehicle.segment}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {showOnRequest
                    ? "Available on request"
                    : `₹${vehicle.totalFare}`}
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
                {selectedSegment.segment === "TEMPO" ||
                selectedSegment.segment === "URBANIA"
                  ? "—"
                  : `₹${selectedSegment.baseFare}`}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">
                Driver Allowance ({fareData.days} days)
              </Text>
              <Text className="font-semibold">
                {selectedSegment.segment === "TEMPO" ||
                selectedSegment.segment === "URBANIA"
                  ? "—"
                  : `₹${selectedSegment.driverAllowance}`}
              </Text>
            </View>
            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
              <Text className="font-bold text-lg text-gray-800">
                Total Fare
              </Text>
              <Text className="font-bold text-lg text-brand-primary">
                {selectedSegment.segment === "TEMPO" ||
                selectedSegment.segment === "URBANIA"
                  ? "Available on request"
                  : `₹${selectedSegment.totalFare}`}
              </Text>
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
                  selectedSegment.segment === "TEMPO" ||
                  selectedSegment.segment === "URBANIA";
                const upfront =
                  selectedSegment.paymentTiers?.[tierKeyOption]?.upfront ?? 0;

                return (
                  <TouchableOpacity
                    key={tier}
                    onPress={() =>
                      !disabledTier && setPaymentTier(tier as PaymentTier)
                    }
                    disabled={disabledTier}
                    className={`flex-1 py-2 items-center rounded-full ${paymentTier === tier ? "bg-white shadow-sm" : ""} ${disabledTier ? "opacity-60" : ""}`}
                  >
                    <Text
                      className={`text-xs font-bold ${paymentTier === tier ? "text-brand-primary" : "text-gray-600"}`}
                    >
                      Pay {tier}%
                    </Text>
                    <Text
                      className={`text-[10px] ${paymentTier === tier ? "text-brand-primary" : "text-gray-500"}`}
                    >
                      {disabledTier ? "—" : `₹${upfront}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs text-gray-500 text-center">
              {selectedSegment.segment === "TEMPO" ||
              selectedSegment.segment === "URBANIA"
                ? "Our team will confirm availability and pricing manually."
                : `Balance of ₹${selectedSegment.paymentTiers?.[tierKey]?.balance ?? 0} paid directly to driver during trip.`}
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
