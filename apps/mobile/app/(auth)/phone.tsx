import type { Href } from "expo-router";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = useAuthStore((s) => s.sendOtp);
  const selectedRole = useAuthStore((s) => s.selectedRole);

  const handleSend = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-16 pb-10 justify-between">
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text className="text-brand-text font-bold text-3xl mb-2">
              Enter your{"\n"}phone number
            </Text>
            <Text className="text-brand-sub text-base">
              We'll send a 6-digit OTP to verify
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="gap-4"
          >
            <View className="bg-brand-card border border-brand-muted rounded-2xl flex-row items-center px-4 h-16">
              <Text className="text-brand-sub font-medium text-base mr-3">
                🇮🇳 +91
              </Text>
              <View className="w-px h-8 bg-brand-muted mr-3" />
              <TextInput
                className="flex-1 text-brand-text font-medium text-lg"
                placeholder="98XXXXXXXX"
                placeholderTextColor="#9896B0"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <Text className="text-brand-sub text-xs text-center">
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Button
              label="Send OTP"
              onPress={handleSend}
              loading={loading}
              disabled={phone.length !== 10}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
