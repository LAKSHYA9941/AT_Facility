import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState, useEffect } from "react";
import { api } from "../../utils/api";

const WEEK_BARS = [
  { day: "Mon", amount: 1200, trips: 4 },
  { day: "Tue", amount: 1850, trips: 6 },
  { day: "Wed", amount: 980, trips: 3 },
  { day: "Thu", amount: 2100, trips: 7 },
  { day: "Fri", amount: 1640, trips: 5 },
  { day: "Sat", amount: 2400, trips: 8 },
  { day: "Sun", amount: 1840, trips: 6 },
];

const MAX_AMOUNT = Math.max(...WEEK_BARS.map((b) => b.amount));

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([
    { val: "0", label: "Trips today" },
    { val: "₹0", label: "Today" },
    { val: "₹0", label: "This week" },
    { val: "₹0", label: "This month" },
  ]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [earningsRes, historyRes] = await Promise.all([
        api.get("/api/driver/earnings"),
        api.get("/api/driver/earnings/history"),
      ]);

      const data = earningsRes.data.data;
      setSummary([
        { val: `${data.tripsToday || 0}`, label: "Trips today" },
        { val: `₹${data.today || 0}`, label: "Today" },
        { val: `₹${data.thisWeek || 0}`, label: "This week" },
        { val: `₹${data.thisMonth || 0}`, label: "This month" },
      ]);

      setTransactions(historyRes.data.data || []);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to fetch earnings",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-brand-text font-bold text-xl">Earnings</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1B4F8A" className="mt-10" />
        ) : (
          <>
            {/* Summary grid */}
            <Animated.View
              entering={FadeInDown.delay(80).springify()}
              className="flex-row flex-wrap gap-3 px-5 pb-4"
            >
              {summary.map((s) => (
                <View
                  key={s.label}
                  className="bg-brand-input rounded-2xl py-3 items-center"
                  style={{ width: "47%" }}
                >
                  <Text className="text-brand-primary font-bold text-xl">
                    {s.val}
                  </Text>
                  <Text className="text-brand-sub text-xs mt-1">{s.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* Weekly bar chart */}
            <Animated.View
              entering={FadeInDown.delay(140).springify()}
              className="mx-5 mb-4 bg-brand-input rounded-2xl px-4 pt-4 pb-3"
            >
              <Text className="text-brand-text font-bold text-sm mb-4">
                This week
              </Text>
              <View
                className="flex-row items-end justify-between"
                style={{ height: 80 }}
              >
                {WEEK_BARS.map((b, i) => {
                  const barH = Math.max(8, (b.amount / MAX_AMOUNT) * 72);
                  const isToday = b.day === "Sun";
                  return (
                    <View
                      key={b.day}
                      className="items-center gap-1"
                      style={{ flex: 1 }}
                    >
                      <View
                        style={{
                          height: barH,
                          width: 20,
                          borderRadius: 6,
                          backgroundColor: isToday ? "#1B4F8A" : "#C7D6E8",
                        }}
                      />
                      <Text className="text-brand-sub" style={{ fontSize: 9 }}>
                        {b.day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Payout card */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="mx-5 mb-4 border border-brand-border rounded-2xl px-4 py-4 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-brand-input items-center justify-center">
                <Text style={{ fontSize: 18 }}>🏦</Text>
              </View>
              <View className="flex-1">
                <Text className="text-brand-sub text-xs">Next payout</Text>
                <Text className="text-brand-text font-bold text-sm">
                  HDFC ···· 8821
                </Text>
                <Text className="text-brand-sub text-xs mt-0.5">
                  Monday, 9 AM · {summary[2]?.val || "₹0"}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.8}>
                <Text className="text-brand-primary font-semibold text-sm">
                  Change
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Trip transactions */}
            <Text className="text-brand-sub font-semibold text-xs px-5 pb-2 uppercase tracking-widest">
              Recent trips
            </Text>
            {transactions.map((t, i) => (
              <Animated.View
                key={t.id || i}
                entering={FadeInDown.delay(240 + i * 40).springify()}
                className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border"
              >
                <View className="w-10 h-10 rounded-2xl bg-brand-input items-center justify-center">
                  <Text style={{ fontSize: 18 }}>🚗</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-sm">
                    Ride #{t.id?.slice(-4) || "0000"}
                  </Text>
                  <Text
                    className="text-brand-sub text-xs mt-0.5"
                    numberOfLines={1}
                  >
                    {t.route || "Location not available"}
                  </Text>
                  <Text className="text-brand-sub text-xs mt-0.5">
                    {new Date(t.createdAt || Date.now()).toLocaleString()}
                  </Text>
                </View>
                <Text className="text-green-600 font-bold text-sm">
                  +₹{t.net || t.fare || 0}
                </Text>
              </Animated.View>
            ))}
            {transactions.length === 0 && (
              <Text className="text-center text-gray-500 mt-5">
                No recent transactions.
              </Text>
            )}
          </>
        )}

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
