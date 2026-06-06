import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import {
  SkeletonStatCard,
  SkeletonBarChart,
  SkeletonCard,
} from "../../components/SkeletonLoader";

import { LogOut } from "lucide-react-native";
import { useAuthStore } from "../../store/auth";

const WEEK = [
  { day: "Mon", rides: 142 },
  { day: "Tue", rides: 198 },
  { day: "Wed", rides: 167 },
  { day: "Thu", rides: 210 },
  { day: "Fri", rides: 243 },
  { day: "Sat", rides: 289 },
  { day: "Sun", rides: 186 },
];
const MAX_RIDES = Math.max(...WEEK.map((w) => w.rides));

type StatItem = {
  val: string;
  label: string;
  emoji: string;
  color: string;
  text: string;
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const statsRes = await api.get("/api/admin/stats");
      const data = statsRes.data.data;

      setStats([
        {
          val: `${data.totalCustomers || 0}`,
          label: "Total riders",
          emoji: "🧳",
          color: "#EEF2F7",
          text: "#1B4F8A",
        },
        {
          val: `${data.totalDrivers || 0}`,
          label: "Total drivers",
          emoji: "🚗",
          color: "#EEF2F7",
          text: "#1B4F8A",
        },
        {
          val: `${data.tripsToday || 0}`,
          label: "Rides today",
          emoji: "📍",
          color: "#EAF3DE",
          text: "#3B6D11",
        },
        {
          val: `₹${data.revenueToday || 0}`,
          label: "Revenue today",
          emoji: "💰",
          color: "#FAEEDA",
          text: "#854F0B",
        },
        {
          val: `${data.pendingKyc || 0}`,
          label: "KYC pending",
          emoji: "📋",
          color: "#FAEEDA",
          text: "#854F0B",
        },
        {
          val: `${data.pendingIdProofs || 0}`,
          label: "ID proofs pending",
          emoji: "🪪",
          color: "#FCEBEB",
          text: "#A32D2D",
        },
      ]);
    } catch (error: any) {
      console.error("Dashboard stats error:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const res = await api.get("/api/admin/activity?limit=15");
      setActivity(res.data.data || []);
    } catch {
      // Activity endpoint might not exist yet — fail silently
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(true), fetchActivity()]);
    setRefreshing(false);
  }, [fetchDashboardData, fetchActivity]);

  useEffect(() => {
    fetchDashboardData();
    fetchActivity();
  }, [fetchDashboardData, fetchActivity]);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B4F8A"
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(60).springify()}
          className="px-5 pt-4 pb-2 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-brand-sub text-sm">{greeting} 👋</Text>
            <Text className="text-brand-text font-bold text-2xl">
              Admin Panel
            </Text>
            <Text className="text-brand-sub text-xs mt-1">
              {now.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-red-50 items-center justify-center border border-red-100"
          >
            <LogOut size={18} color="#A32D2D" />
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <>
            {/* Skeleton stats grid */}
            <View className="px-5 mt-3">
              <View className="flex-row flex-wrap gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonStatCard key={i} />
                ))}
              </View>
            </View>

            {/* Skeleton bar chart */}
            <SkeletonBarChart />

            {/* Skeleton quick actions */}
            <View className="flex-row gap-3 mx-5 mt-4">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 80,
                    borderRadius: 16,
                    backgroundColor: "#EEF2F7",
                  }}
                />
              ))}
            </View>

            {/* Skeleton activity feed */}
            <View className="mt-5">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Stats grid */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="px-5 mt-3"
            >
              <View className="flex-row flex-wrap gap-3">
                {stats.map((s, i) => (
                  <Animated.View
                    key={s.label}
                    entering={FadeInDown.delay(120 + i * 40).springify()}
                    style={{
                      width: "47%",
                      backgroundColor: s.color,
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 6 }}>
                      {s.emoji}
                    </Text>
                    <Text
                      style={{ color: s.text, fontWeight: "700", fontSize: 22 }}
                    >
                      {s.val}
                    </Text>
                    <Text
                      style={{
                        color: s.text,
                        fontSize: 12,
                        marginTop: 2,
                        opacity: 0.8,
                      }}
                    >
                      {s.label}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>

            {/* Weekly rides bar chart */}
            <Animated.View
              entering={FadeInDown.delay(360).springify()}
              className="mx-5 mt-5 bg-brand-input rounded-2xl px-4 pt-4 pb-3"
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-brand-text font-bold text-sm">
                  Rides this week
                </Text>
                <Text className="text-brand-primary font-bold text-sm">
                  1,435 total
                </Text>
              </View>
              <View
                className="flex-row items-end justify-between"
                style={{ height: 80 }}
              >
                {WEEK.map((w) => {
                  const barH = Math.max(8, (w.rides / MAX_RIDES) * 72);
                  const isToday = w.day === "Sun";
                  return (
                    <View
                      key={w.day}
                      className="items-center gap-1"
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={{
                          fontSize: 8,
                          color: "#9CA3AF",
                          marginBottom: 2,
                        }}
                      >
                        {w.rides}
                      </Text>
                      <View
                        style={{
                          height: barH,
                          width: 22,
                          borderRadius: 6,
                          backgroundColor: isToday ? "#1B4F8A" : "#C7D6E8",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 9,
                          color: isToday ? "#1B4F8A" : "#9CA3AF",
                          fontWeight: isToday ? "700" : "400",
                        }}
                      >
                        {w.day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Quick actions */}
            <Animated.View
              entering={FadeInDown.delay(420).springify()}
              className="flex-row gap-3 mx-5 mt-4"
            >
              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-1 bg-brand-primary rounded-2xl py-4 items-center gap-1"
              >
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text className="text-white font-bold text-xs text-center">
                  Verify KYC{"\n"}Queue (
                  {stats.find((s) => s.label === "KYC pending")?.val || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl py-4 items-center gap-1"
              >
                <Text style={{ fontSize: 20 }}>🪪</Text>
                <Text className="text-amber-700 font-bold text-xs text-center">
                  ID Proofs{"\n"}Queue (
                  {stats.find((s) => s.label === "ID proofs pending")?.val || 0}
                  )
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-1 bg-green-50 border border-green-100 rounded-2xl py-4 items-center gap-1"
              >
                <Text style={{ fontSize: 20 }}>📊</Text>
                <Text className="text-green-700 font-bold text-xs text-center">
                  Full{"\n"}Reports
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Activity feed */}
            <Animated.View
              entering={FadeInDown.delay(480).springify()}
              className="mt-5"
            >
              <Text className="text-brand-sub font-semibold text-xs px-5 pb-3 uppercase tracking-widest">
                Recent activity
              </Text>

              {activityLoading ? (
                [1, 2, 3].map((i) => <SkeletonCard key={i} />)
              ) : activity.length === 0 ? (
                <Text className="text-center text-gray-500 mt-5">
                  No recent activity.
                </Text>
              ) : (
                activity.map((a, i) => (
                  <Animated.View
                    key={a.id || i}
                    entering={FadeInDown.delay(500 + i * 40).springify()}
                    className="flex-row items-center gap-3 px-5 py-3 border-b border-brand-border"
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: a.color || "#EEF2F7",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{a.icon || "🔔"}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-brand-text font-bold text-sm">
                        {a.event || "System Update"}
                      </Text>
                      <Text className="text-brand-sub text-xs mt-0.5">
                        {a.sub || ""}
                      </Text>
                    </View>
                    <Text className="text-brand-sub text-xs">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </Text>
                  </Animated.View>
                ))
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
