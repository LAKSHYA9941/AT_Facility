import { View, Text, ScrollView } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Animated, { FadeInDown } from "react-native-reanimated";

const segments = [
  { name: "Mitra", emoji: "🚗", sub: "Affordable" },
  { name: "Vega", emoji: "🚙", sub: "Comfort" },
  { name: "Aurus", emoji: "🏎️", sub: "Luxury" },
  { name: "Samuha", emoji: "🚐", sub: "Group" },
  { name: "Svair", emoji: "⚡", sub: "Electric" },
  { name: "Chakra", emoji: "🔑", sub: "Self-drive" },
];

export default function CustomerHome() {
  return (
    <ScreenWrapper>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row justify-between items-center pt-4 pb-6">
          <View>
            <Text className="text-brand-sub text-sm">Good morning 👋</Text>
            <Text className="text-brand-text font-bold text-xl">Where to today?</Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-brand-primary items-center justify-center">
            <Text className="text-white font-bold">R</Text>
          </View>
        </Animated.View>

        {/* Search bar */}
        <Animated.View entering={FadeInDown.delay(150).springify()} className="bg-brand-card border border-brand-muted rounded-2xl px-4 h-14 flex-row items-center mb-6">
          <Text className="text-brand-sub mr-3">🔍</Text>
          <Text className="text-brand-sub text-base">Search destination...</Text>
        </Animated.View>

        {/* Segments */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text className="text-brand-text font-bold text-lg mb-4">Choose your ride</Text>
          <View className="flex-row flex-wrap gap-3">
            {segments.map((s, i) => (
              <Animated.View key={s.name} entering={FadeInDown.delay(220 + i * 40).springify()}>
                <View className="bg-brand-card border border-brand-muted rounded-2xl p-4 w-28 items-center gap-1">
                  <Text className="text-3xl">{s.emoji}</Text>
                  <Text className="text-brand-text font-bold text-sm">{s.name}</Text>
                  <Text className="text-brand-sub text-xs">{s.sub}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View className="h-10" />
      </ScrollView>
    </ScreenWrapper>
  );
}