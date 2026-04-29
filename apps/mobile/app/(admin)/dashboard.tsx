import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

const STATS = [
  {
    val: "1,284",
    label: "Total riders",
    emoji: "🧳",
    color: "#EEF2F7",
    text: "#1B4F8A",
  },
  {
    val: "342",
    label: "Total drivers",
    emoji: "🚗",
    color: "#EEF2F7",
    text: "#1B4F8A",
  },
  {
    val: "186",
    label: "Rides today",
    emoji: "📍",
    color: "#EAF3DE",
    text: "#3B6D11",
  },
  {
    val: "₹84k",
    label: "Revenue today",
    emoji: "💰",
    color: "#FAEEDA",
    text: "#854F0B",
  },
  {
    val: "14",
    label: "KYC pending",
    emoji: "📋",
    color: "#FAEEDA",
    text: "#854F0B",
  },
  {
    val: "3",
    label: "Flagged users",
    emoji: "🚩",
    color: "#FCEBEB",
    text: "#A32D2D",
  },
];

const ACTIVITY = [
  {
    id: "1",
    icon: "🆕",
    event: "New driver registered",
    sub: "Ravi Kumar · DL submitted",
    time: "2 min ago",
    color: "#E6F1FB",
  },
  {
    id: "2",
    icon: "✅",
    event: "KYC approved",
    sub: "Sunita Sharma · All docs verified",
    time: "14 min ago",
    color: "#EAF3DE",
  },
  {
    id: "3",
    icon: "🚕",
    event: "Ride completed",
    sub: "Chhotu Express · ₹184 · 8.2km",
    time: "18 min ago",
    color: "#EEF2F7",
  },
  {
    id: "4",
    icon: "❌",
    event: "KYC rejected",
    sub: "Arun Verma · Aadhaar mismatch",
    time: "32 min ago",
    color: "#FCEBEB",
  },
  {
    id: "5",
    icon: "🚕",
    event: "Ride completed",
    sub: "Nawab Sahab · ₹680 · 18km",
    time: "45 min ago",
    color: "#EEF2F7",
  },
  {
    id: "6",
    icon: "🚩",
    event: "User flagged",
    sub: "Complaint raised by rider",
    time: "1 hr ago",
    color: "#FAEEDA",
  },
  {
    id: "7",
    icon: "🆕",
    event: "New customer signed up",
    sub: "Meera Patel · Delhi",
    time: "1 hr ago",
    color: "#E6F1FB",
  },
];

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

export default function DashboardScreen() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(60).springify()}
          className="px-5 pt-4 pb-2"
        >
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
        </Animated.View>

        {/* Stats grid */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="px-5 mt-3"
        >
          <View className="flex-row flex-wrap gap-3">
            {STATS.map((s, i) => (
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
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</Text>
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
                    style={{ fontSize: 8, color: "#9CA3AF", marginBottom: 2 }}
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
              Verify KYC{"\n"}Queue (14)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-1 bg-red-50 border border-red-100 rounded-2xl py-4 items-center gap-1"
          >
            <Text style={{ fontSize: 20 }}>🚩</Text>
            <Text className="text-red-600 font-bold text-xs text-center">
              Flagged{"\n"}Users (3)
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
          {ACTIVITY.map((a, i) => (
            <Animated.View
              key={a.id}
              entering={FadeInDown.delay(500 + i * 40).springify()}
              className="flex-row items-center gap-3 px-5 py-3 border-b border-brand-border"
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: a.color,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16 }}>{a.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-brand-text font-bold text-sm">
                  {a.event}
                </Text>
                <Text className="text-brand-sub text-xs mt-0.5">{a.sub}</Text>
              </View>
              <Text className="text-brand-sub text-xs">{a.time}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
