import type { Href } from "expo-router";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";

export default function Welcome() {
  return (
    <ScreenWrapper>
      <View className="flex-1 px-6 justify-between pb-10">

        {/* Top brand mark */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="mt-16 items-center">
          <View className="w-20 h-20 rounded-3xl bg-brand-primary items-center justify-center mb-6">
            <Text className="text-white font-bold text-3xl">Y</Text>
          </View>
          <Text className="text-brand-text font-bold text-4xl tracking-tight">YatraGo</Text>
          <Text className="text-brand-sub font-medium text-base mt-2">Rides. Rentals. Getaways.</Text>
        </Animated.View>

        {/* Illustration placeholder */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="flex-1 items-center justify-center">
          <View className="w-72 h-72 rounded-full bg-brand-card items-center justify-center">
            <Text className="text-7xl">🚗</Text>
          </View>
          {/* Replace with Lottie animation later */}
        </Animated.View>

        {/* Bottom CTA */}
        <Animated.View entering={FadeInUp.delay(300).springify()} className="gap-3">
          <Text className="text-brand-text font-bold text-3xl text-center leading-tight">
            Your journey,{"\n"}your way.
          </Text>
          <Text className="text-brand-sub text-center text-sm mb-4">
            Book rides across 6 segments, explore vacation packages, or rent a car for the day.
          </Text>
          <Button label="Get started" onPress={() => router.push("/(onboarding)/role-select" as Href)} />
          <Button label="I already have an account" variant="ghost" onPress={() => router.push("/(auth)/phone" as Href)} />
        </Animated.View>

      </View>
    </ScreenWrapper>
  );
}