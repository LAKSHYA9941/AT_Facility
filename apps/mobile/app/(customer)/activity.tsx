import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { api } from "../../utils/api";
import { Car, Compass, Key } from "lucide-react-native";

const TABS = ["Rides", "Packages", "Rentals"];

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-500", label: "Cancelled" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", label: "Confirmed" },
  PENDING: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  PENDING_PAYMENT: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    label: "Awaiting Payment",
  },
  DRIVER_ASSIGNED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Driver Assigned",
  },
  DRIVER_ENROUTE: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    label: "En Route",
  },
  ACTIVE: { bg: "bg-purple-50", text: "text-purple-700", label: "Active" },
};

function TripRow({
  item,
  onPayBalance,
}: {
  item: any;
  onPayBalance: (item: any) => void;
}) {
  const s = STATUS_STYLE[item.status] ?? {
    bg: "bg-gray-50",
    text: "text-gray-700",
    label: item.status,
  };
  const dateStr = new Date(item.startDate ?? item.createdAt).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  // Waypoints are ordered; first = pickup, last = drop
  const waypoints: any[] = item.waypoints ?? [];
  const pickup = waypoints[0]?.address?.split(",")[0] ?? "Pickup";
  const drop =
    waypoints[waypoints.length - 1]?.address?.split(",")[0] ?? "Destination";

  const routeDisplay =
    item.tripType === "ROUND_TRIP"
      ? `[Round Trip] ${waypoints.map((w) => w.address.split(",")[0]).join(" → ")}`
      : `${pickup} → ${drop}`;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="px-5 py-4 border-b border-brand-border"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
          <Car size={20} color="#1B4F8A" />
        </View>
        <View className="flex-1">
          <Text className="text-brand-text font-bold text-sm">
            {routeDisplay}
          </Text>
          <Text className="text-brand-sub text-xs mt-0.5">
            {item.driver?.user?.name
              ? `Driver: ${item.driver.user.name}`
              : "No driver yet"}
          </Text>
          <Text className="text-brand-sub text-xs mt-0.5">{dateStr}</Text>
          <View
            className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${s.bg}`}
          >
            <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
          </View>
        </View>
        <Text className="text-brand-primary font-bold text-sm">
          {item.totalFare ? `₹${item.totalFare.toLocaleString("en-IN")}` : "—"}
        </Text>
      </View>

      {item.balanceRemaining > 0 &&
        item.status !== "CANCELLED" &&
        item.status !== "PENDING_PAYMENT" &&
        item.status !== "COMPLETED" && (
          <View className="mt-4 flex-row items-center justify-between bg-orange-50 p-3 rounded-xl border border-orange-100">
            <View>
              <Text className="text-orange-800 text-xs font-semibold">
                Pending Balance
              </Text>
              <Text className="text-orange-800 font-bold text-lg">
                ₹{item.balanceRemaining.toLocaleString("en-IN")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onPayBalance(item)}
              className="bg-orange-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-bold text-xs">Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}

      {item.driver && (
        <View className="mt-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
          <Text className="text-blue-800 text-xs font-semibold mb-1">
            Accepted By:
          </Text>
          <Text className="text-blue-900 font-bold text-sm">
            {item.driver.user?.name} • {item.driver.user?.phone}
          </Text>
          {item.driver.vehicle && (
            <Text className="text-blue-700 text-xs mt-0.5">
              {item.driver.vehicle.make} {item.driver.vehicle.model} • Plate:{" "}
              {item.driver.vehicle.plateNumber}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.push(`/(customer)/active-trip?tripId=${item.id}`)}
        className="mt-4 bg-gray-100 p-3 rounded-xl items-center border border-gray-200"
      >
        <Text className="text-gray-800 font-bold text-xs">Full Details</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PackageRow({ item, type }: { item: any; type: "PACKAGE" | "RENTAL" }) {
  const s = STATUS_STYLE[item.status] || {
    bg: "bg-gray-50",
    text: "text-gray-700",
    label: item.status,
  };
  const dateStr = new Date(item.createdAt).toLocaleDateString();

  const title =
    type === "PACKAGE"
      ? item.package?.title
      : item.vehicle?.make + " " + item.vehicle?.model;
  const sub =
    type === "PACKAGE" ? `${item.numPeople} adults` : `${item.totalDays} days`;
  const price = type === "PACKAGE" ? item.totalPrice : item.baseTotalPrice;
  const IconComponent = type === "PACKAGE" ? Compass : Key;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
    >
      <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
        <IconComponent size={20} color="#1B4F8A" />
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-bold text-sm">{title}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">{sub}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">{dateStr}</Text>
        <View className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
        </View>
      </View>
      <Text className="text-brand-primary font-bold text-sm">
        ₹{price?.toLocaleString() || "0"}
      </Text>
    </Animated.View>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // /api/trips/my — customer trip history
      const [tripsRes, pkgsRes, rentalsRes] = await Promise.allSettled([
        api.get("/api/trips/my"),
        api.get("/api/packages/bookings/my"),
        api.get("/api/rentals/my"),
      ]);

      if (tripsRes.status === "fulfilled") {
        const d = tripsRes.value.data.data;
        setTrips(Array.isArray(d) ? d : (d?.trips ?? []));
      }
      if (pkgsRes.status === "fulfilled") {
        setPackages(pkgsRes.value.data.data ?? []);
      }
      if (rentalsRes.status === "fulfilled") {
        setRentals(rentalsRes.value.data.data ?? []);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load activity",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayBalance = (item: any) => {
    router.push(`/(customer)/active-trip?tripId=${item.id}`);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-brand-border">
        <Text className="text-brand-text font-bold text-xl">Activity</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={fetchData}
          className="bg-brand-input border border-brand-border rounded-full px-4 py-1.5"
        >
          <Text className="text-brand-primary font-semibold text-xs">
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-brand-border">
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(i)}
            className="flex-1 py-3 items-center"
            style={{
              borderBottomWidth: 2,
              borderBottomColor: tab === i ? "#1B4F8A" : "transparent",
            }}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === i ? "text-brand-primary" : "text-brand-sub"
              }`}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#1B4F8A" className="mt-10" />
        ) : (
          <>
            {tab === 0 &&
              trips.map((item) => (
                <TripRow
                  key={item.id}
                  item={item}
                  onPayBalance={handlePayBalance}
                />
              ))}
            {tab === 1 &&
              packages.map((item) => (
                <PackageRow key={item.id} item={item} type="PACKAGE" />
              ))}
            {tab === 2 &&
              rentals.map((item) => (
                <PackageRow key={item.id} item={item} type="RENTAL" />
              ))}
            {((tab === 0 && trips.length === 0) ||
              (tab === 1 && packages.length === 0) ||
              (tab === 2 && rentals.length === 0)) && (
              <View className="items-center mt-16 px-8">
                {tab === 0 ? (
                  <Car size={48} color="#9CA3AF" />
                ) : tab === 1 ? (
                  <Compass size={48} color="#9CA3AF" />
                ) : (
                  <Key size={48} color="#9CA3AF" />
                )}
                <Text className="text-brand-text font-bold text-base mt-3">
                  No history yet
                </Text>
                <Text className="text-brand-sub text-sm text-center mt-1">
                  {tab === 0
                    ? "Your completed trips will appear here"
                    : tab === 1
                      ? "Your package bookings will appear here"
                      : "Your rental bookings will appear here"}
                </Text>
              </View>
            )}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
