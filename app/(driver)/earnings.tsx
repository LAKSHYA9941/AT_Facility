import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

const SUMMARY = [
  { val: "6",      label: "Trips today" },
  { val: "₹1,840", label: "Today" },
  { val: "₹9,200", label: "This week" },
  { val: "₹34.2k", label: "This month" },
];

const WEEK_BARS = [
  { day: "Mon", amount: 1200, trips: 4 },
  { day: "Tue", amount: 1850, trips: 6 },
  { day: "Wed", amount: 980,  trips: 3 },
  { day: "Thu", amount: 2100, trips: 7 },
  { day: "Fri", amount: 1640, trips: 5 },
  { day: "Sat", amount: 2400, trips: 8 },
  { day: "Sun", amount: 1840, trips: 6 },
];

const MAX_AMOUNT = Math.max(...WEEK_BARS.map(b => b.amount));

const TRANSACTIONS = [
  { id: "1", segment: "Shaana Babu", route: "CP → IGI Airport", time: "Today, 6:15 PM", fare: 520, emoji: "🚙" },
  { id: "2", segment: "Chhotu Express", route: "Saket → Lajpat Nagar", time: "Today, 3:30 PM", fare: 184, emoji: "🚗" },
  { id: "3", segment: "Nawab Sahab", route: "Aerocity → Gurugram", time: "Today, 1:10 PM", fare: 680, emoji: "🏎️" },
  { id: "4", segment: "Bijli", route: "Noida → Connaught Place", time: "Today, 10:00 AM", fare: 310, emoji: "🔋" },
  { id: "5", segment: "Chhotu Express", route: "Dwarka → Janakpuri", time: "Today, 8:45 AM", fare: 146, emoji: "🚗" },
];

export default function EarningsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-brand-text font-bold text-xl">Earnings</Text>
        </View>

        {/* Summary grid */}
        <Animated.View entering={FadeInDown.delay(80).springify()} className="flex-row flex-wrap gap-3 px-5 pb-4">
          {SUMMARY.map(s => (
            <View key={s.label} className="bg-brand-input rounded-2xl py-3 items-center" style={{ width: "47%" }}>
              <Text className="text-brand-primary font-bold text-xl">{s.val}</Text>
              <Text className="text-brand-sub text-xs mt-1">{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Weekly bar chart */}
        <Animated.View
          entering={FadeInDown.delay(140).springify()}
          className="mx-5 mb-4 bg-brand-input rounded-2xl px-4 pt-4 pb-3"
        >
          <Text className="text-brand-text font-bold text-sm mb-4">This week</Text>
          <View className="flex-row items-end justify-between" style={{ height: 80 }}>
            {WEEK_BARS.map((b, i) => {
              const barH = Math.max(8, (b.amount / MAX_AMOUNT) * 72);
              const isToday = b.day === "Sun";
              return (
                <View key={b.day} className="items-center gap-1" style={{ flex: 1 }}>
                  <View
                    style={{
                      height: barH,
                      width: 20,
                      borderRadius: 6,
                      backgroundColor: isToday ? "#1B4F8A" : "#C7D6E8",
                    }}
                  />
                  <Text className="text-brand-sub" style={{ fontSize: 9 }}>{b.day}</Text>
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
            <Text className="text-brand-text font-bold text-sm">HDFC ···· 8821</Text>
            <Text className="text-brand-sub text-xs mt-0.5">Monday, 9 AM · ₹9,200</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8}>
            <Text className="text-brand-primary font-semibold text-sm">Change</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Trip transactions */}
        <Text className="text-brand-sub font-semibold text-xs px-5 pb-2 uppercase tracking-widest">
          Today's trips
        </Text>
        {TRANSACTIONS.map((t, i) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.delay(240 + i * 40).springify()}
            className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border"
          >
            <View className="w-10 h-10 rounded-2xl bg-brand-input items-center justify-center">
              <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-brand-text font-bold text-sm">{t.segment}</Text>
              <Text className="text-brand-sub text-xs mt-0.5">{t.route}</Text>
              <Text className="text-brand-sub text-xs mt-0.5">{t.time}</Text>
            </View>
            <Text className="text-green-600 font-bold text-sm">+₹{t.fare}</Text>
          </Animated.View>
        ))}

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}