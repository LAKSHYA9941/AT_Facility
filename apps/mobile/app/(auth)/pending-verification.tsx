import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";
import { ShieldAlert } from "lucide-react-native";

export default function PendingVerificationScreen() {
  const user = useAuthStore((s) => s.user);

  const handleExplore = () => {
    if (user?.role === "CUSTOMER") router.replace("/(customer)/plan-trip");
    if (user?.role === "DRIVER") router.replace("/(driver)/home");
    if (user?.role === "ADMIN") router.replace("/(admin)/dashboard");
  };

  const handleReupload = () => {
    // Navigate to complete-profile with a parameter or just state assuming it goes to step 2 automatically if name is set
    router.push("/(auth)/complete-profile");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2F7]" edges={["top"]}>
      <View className="flex-1 px-6 justify-center items-center">
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="items-center mb-8"
        >
          <ShieldAlert size={64} color="#1B4F8A" style={{ marginBottom: 16 }} />
          <Text className="text-[#1B4F8A] font-bold text-3xl mb-2 text-center">
            Verification in progress
          </Text>
          <Text className="text-[#9CA3AF] text-base text-center mb-6">
            We're reviewing your ID. This usually takes a few hours.
          </Text>
          <View className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-8 w-full">
            <Text className="text-amber-800 text-sm text-center">
              You can explore the app but cannot book trips until verified
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="w-full gap-4"
        >
          <Button label="Explore App" onPress={handleExplore} />
          <Button
            label="Re-upload ID"
            onPress={handleReupload}
            variant="ghost"
            className="text-[#1B4F8A]"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
