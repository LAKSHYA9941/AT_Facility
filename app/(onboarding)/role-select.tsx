import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Animated, { FadeInDown } from "react-native-reanimated";

const roles = [
  {
    id: "customer",
    emoji: "🧳",
    title: "I'm a Rider",
    subtitle: "Book rides, packages & rentals",
    route: "/(auth)/phone",
  },
  {
    id: "driver",
    emoji: "🚘",
    title: "I'm a Driver",
    subtitle: "Earn by driving on YatraGo",
    route: "/(auth)/phone",
  },
];

export default function RoleSelect() {
  return (
    <ScreenWrapper>
      <View className="flex-1 px-6 pt-16 pb-10">
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text className="text-brand-text font-bold text-3xl mb-2">Who are you?</Text>
          <Text className="text-brand-sub text-base mb-10">Choose your role to get started</Text>
        </Animated.View>

        <View className="gap-4">
          {roles.map((role, i) => (
            <Animated.View key={role.id} entering={FadeInDown.delay(150 + i * 80).springify()}>
              <TouchableOpacity
                className="bg-brand-card border border-brand-muted rounded-3xl p-6 flex-row items-center gap-4 active:opacity-80"
                onPress={() => router.push(role.route as any)}
              >
                <View className="w-16 h-16 rounded-2xl bg-brand-muted items-center justify-center">
                  <Text className="text-4xl">{role.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-lg">{role.title}</Text>
                  <Text className="text-brand-sub text-sm mt-1">{role.subtitle}</Text>
                </View>
                <Text className="text-brand-sub text-xl">›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(400).springify()} className="mt-auto">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-brand-sub text-center text-sm">← Go back</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}