import { router } from "expo-router";
import { Image, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/ui/Button";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 px-6 justify-between py-10">
        {/* Brand */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="items-center mt-10"
        >
          <Text className="text-brand-primary font-bold text-4xl tracking-tight">
            At Facility
          </Text>
          <Text className="text-brand-sub font-medium text-base mt-2">
            Rides. Rentals. Getaways.
          </Text>
        </Animated.View>

        {/* Illustration */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="flex-1 items-center justify-center"
        >
          <View className="w-72 h-72 rounded-full bg-brand-input items-center justify-center">
            <Image
              source={require("../../assets/images/icon.jpeg")}
              style={{ width: 140, height: 140, borderRadius: 70 }}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          className="gap-3"
        >
          <Text className="text-brand-text font-bold text-3xl text-center leading-tight">
            Your journey,{"\n"}your way.
          </Text>
          <Text className="text-brand-sub text-center text-sm mb-2">
            Book rides across 6 segments, explore vacation packages, or rent a
            car.
          </Text>
          <Button
            label="Get Started"
            onPress={() => router.push("/(onboarding)/role-select")}
          />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push("/(auth)/login")}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
