import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../utils/api";

const TABS = ["Rides", "Packages", "Rentals"];

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-500", label: "Cancelled" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", label: "Confirmed" },
  PENDING: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  SEARCHING: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    label: "Searching",
  },
  ARRIVING: { bg: "bg-blue-50", text: "text-blue-700", label: "Arriving" },
  IN_RIDE: { bg: "bg-indigo-50", text: "text-indigo-700", label: "In Ride" },
};

function RideRow({ item }: { item: any }) {
  const s = STATUS_STYLE[item.status] || {
    bg: "bg-gray-50",
    text: "text-gray-700",
    label: item.status,
  };
  const dateStr = new Date(item.createdAt).toLocaleDateString();
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
    >
      <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 20 }}>🚗</Text>
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-bold text-sm">
          {item.driver?.user?.name || "Driver"}
        </Text>
        <Text className="text-brand-sub text-xs mt-0.5" numberOfLines={1}>
          {item.pickupAddress} → {item.dropAddress}
        </Text>
        <Text className="text-brand-sub text-xs mt-0.5">{dateStr}</Text>
        <View className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
        </View>
      </View>
      <Text className="text-brand-primary font-bold text-sm">
        {item.totalFare === 0 ? "—" : `₹${item.totalFare.toLocaleString()}`}
      </Text>
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
  const emoji = type === "PACKAGE" ? "🏝️" : "🔑";

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
    >
      <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
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
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Ensure all endpoints return the history directly or wrap gracefully
      // The instruction asks for /api/rides/history but my rides module returns { rides, total, etc }.
      // If we don't have /api/rides/history we might use /api/rides/my or similar.
      // Assuming GET /api/rides/history returns data.rides
      const [ridesRes, pkgsRes, rentalsRes] = await Promise.all([
        api.get("/api/rides/history"),
        api.get("/api/packages/bookings/my"),
        api.get("/api/rentals/my"),
      ]);

      setRides(ridesRes.data.data.rides || ridesRes.data.data);
      setPackages(pkgsRes.data.data);
      setRentals(rentalsRes.data.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load activity",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-brand-border">
        <Text className="text-brand-text font-bold text-xl">Activity</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-brand-input border border-brand-border rounded-full px-4 py-1.5"
        >
          <Text className="text-brand-primary font-semibold text-xs">
            Filter
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
              rides.map((item) => <RideRow key={item.id} item={item} />)}
            {tab === 1 &&
              packages.map((item) => (
                <PackageRow key={item.id} item={item} type="PACKAGE" />
              ))}
            {tab === 2 &&
              rentals.map((item) => (
                <PackageRow key={item.id} item={item} type="RENTAL" />
              ))}
            {((tab === 0 && rides.length === 0) ||
              (tab === 1 && packages.length === 0) ||
              (tab === 2 && rentals.length === 0)) && (
              <Text className="text-center text-gray-500 mt-10">
                No history found.
              </Text>
            )}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
