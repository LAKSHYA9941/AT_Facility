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
import { api } from "../../utils/api";
import { SecureStorage } from "../../utils/secureStorage";
import { Lock } from "lucide-react-native";

const ADMIN_PHONE = "9999999999";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = useAuthStore((s) => s.sendOtp);
  const selectedRole = useAuthStore((s) => s.selectedRole);

  const handleSend = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    try {
      // ── Admin shortcut: 9999999999 goes straight to admin panel ──
      if (phone === ADMIN_PHONE) {
        // Call the backend which already has this hardcoded admin or create an admin session
        await sendOtp(phone);
        router.push({
          pathname: "/(auth)/otp",
          params: { phone, isAdmin: "1" },
        });
        return;
      }

      await sendOtp(phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const isAdminPhone = phone === ADMIN_PHONE;

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
              {isAdminPhone
                ? "Admin access detected"
                : "We'll send a 6-digit OTP to verify"}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="gap-4"
          >
            <View
              className="bg-brand-card border border-brand-muted rounded-2xl flex-row items-center px-4 h-16"
              style={{ borderColor: isAdminPhone ? "#1B4F8A" : undefined }}
            >
              <Text className="text-brand-sub font-medium text-base mr-3">
                IN +91
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
              {isAdminPhone && <Lock size={18} color="#1B4F8A" />}
            </View>
            {isAdminPhone ? (
              <Text className="text-brand-primary text-xs text-center font-semibold">
                Admin account — OTP will verify your identity
              </Text>
            ) : (
              <Text className="text-brand-sub text-xs text-center">
                By continuing, you agree to our Terms &amp; Privacy Policy
              </Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Button
              label={isAdminPhone ? "Access Admin Panel" : "Send OTP"}
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
