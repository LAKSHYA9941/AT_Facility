import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

const TABS = ["Rides", "Packages", "Rentals"];

const RIDES = [
  {
    id: "1",
    name: "Chhotu Express",
    route: "Connaught Pl → Saket",
    km: "8.2km",
    time: "Today, 10:32 AM",
    price: 184,
    status: "completed",
    emoji: "🚗",
  },
  {
    id: "2",
    name: "Shaana Babu",
    route: "IGI Airport → Gurugram",
    km: "28km",
    time: "Yesterday, 6:15 PM",
    price: 520,
    status: "completed",
    emoji: "🚙",
  },
  {
    id: "3",
    name: "Nawab Sahab",
    route: "DLF Cyber City → Vasant Kunj",
    km: "12km",
    time: "Yesterday, 2:40 PM",
    price: 0,
    status: "cancelled",
    emoji: "🏎️",
  },
  {
    id: "4",
    name: "Bijli",
    route: "Lajpat Nagar → Noida Sec 62",
    km: "22km",
    time: "Mon, 9:00 AM",
    price: 310,
    status: "completed",
    emoji: "🔋",
  },
  {
    id: "5",
    name: "Baaraati",
    route: "Dwarka → Agra",
    km: "210km",
    time: "Sun, 7:00 AM",
    price: 1850,
    status: "completed",
    emoji: "🚐",
  },
];

const PACKAGES = [
  {
    id: "1",
    name: "Maldives Retreat",
    sub: "5 days · 2 adults",
    time: "Booked 3 days ago",
    price: 129900,
    status: "confirmed",
    emoji: "🏝️",
  },
  {
    id: "2",
    name: "Swiss Alps Adventure",
    sub: "7 days · 4 adults",
    time: "Booked last week",
    price: 240000,
    status: "completed",
    emoji: "⛰️",
  },
];

const RENTALS = [
  {
    id: "1",
    name: "Apni Marzi",
    sub: "Swift Dzire · 2 days",
    time: "Sat–Sun",
    price: 1998,
    status: "completed",
    emoji: "🔑",
  },
  {
    id: "2",
    name: "Apni Marzi",
    sub: "Innova · 4 days",
    time: "Last month",
    price: 5996,
    status: "completed",
    emoji: "🔑",
  },
];

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-red-50", text: "text-red-500", label: "Cancelled" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", label: "Confirmed" },
};

function RideRow({ item }: { item: (typeof RIDES)[0] }) {
  const s = STATUS_STYLE[item.status];
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
    >
      <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-bold text-sm">{item.name}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">
          {item.route} · {item.km}
        </Text>
        <Text className="text-brand-sub text-xs mt-0.5">{item.time}</Text>
        <View className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
        </View>
      </View>
      <Text className="text-brand-primary font-bold text-sm">
        {item.price === 0 ? "—" : `₹${item.price.toLocaleString()}`}
      </Text>
    </Animated.View>
  );
}

function PackageRow({ item }: { item: (typeof PACKAGES)[0] }) {
  const s = STATUS_STYLE[item.status];
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
    >
      <View className="w-11 h-11 rounded-2xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-bold text-sm">{item.name}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">{item.sub}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">{item.time}</Text>
        <View className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
        </View>
      </View>
      <Text className="text-brand-primary font-bold text-sm">
        ₹{item.price.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

export default function ActivityScreen() {
  const [tab, setTab] = useState(0);

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

      {/* Stats strip */}
      <View className="flex-row gap-3 px-5 py-4 border-b border-brand-border">
        {[
          { val: "24", label: "Total rides" },
          { val: "₹4.2k", label: "Total spent" },
          { val: "4.9★", label: "Avg rating" },
        ].map((s) => (
          <View
            key={s.label}
            className="flex-1 bg-brand-input rounded-2xl py-3 items-center"
          >
            <Text className="text-brand-primary font-bold text-base">
              {s.val}
            </Text>
            <Text className="text-brand-sub text-xs mt-0.5">{s.label}</Text>
          </View>
        ))}
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
        {tab === 0 &&
          RIDES.map((item) => <RideRow key={item.id} item={item} />)}
        {tab === 1 &&
          PACKAGES.map((item) => <PackageRow key={item.id} item={item} />)}
        {tab === 2 &&
          RENTALS.map((item) => (
            <PackageRow key={item.id} item={item as any} />
          ))}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
