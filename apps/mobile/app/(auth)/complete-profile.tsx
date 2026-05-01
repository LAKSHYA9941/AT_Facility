import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";

export default function CompleteProfileScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const completeProfile = useAuthStore((s) => s.completeProfile);
  const user = useAuthStore((s) => s.user);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await completeProfile(name.trim(), email.trim() || undefined);
      if (user?.role === "CUSTOMER") router.replace("/(customer)/ride");
      if (user?.role === "DRIVER") router.replace("/(driver)/home");
      if (user?.role === "ADMIN") router.replace("/(admin)/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-10 pb-8 justify-between">
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Text className="text-brand-primary font-bold text-3xl mb-2">
              Complete your profile
            </Text>
            <Text className="text-brand-sub text-sm">
              Just a couple more details to get you started
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(160).springify()}
            className="gap-5"
          >
            {/* Name */}
            <View className="gap-2">
              <Text className="text-brand-text font-semibold text-xs tracking-widest uppercase">
                Full Name
              </Text>
              <View className="bg-white border border-brand-border rounded-2xl px-4 h-14 justify-center">
                <TextInput
                  className="text-brand-text font-medium text-base"
                  placeholder="Rahul Kumar"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View className="gap-2">
              <Text className="text-brand-text font-semibold text-xs tracking-widest uppercase">
                Email Address{" "}
                <Text className="text-brand-sub normal-case">(optional)</Text>
              </Text>
              <View className="bg-white border border-brand-border rounded-2xl px-4 h-14 justify-center">
                <TextInput
                  className="text-brand-text font-medium text-base"
                  placeholder="rahul@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Button
              label="Let's Go →"
              onPress={handleSubmit}
              loading={loading}
              disabled={!name.trim()}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
