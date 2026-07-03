import type { Href } from "expo-router";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../store/auth";

export default function OTPScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);

  const { phone, isAdmin } = useLocalSearchParams<{
    phone: string;
    isAdmin?: string;
  }>();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const handleChange = (val: string, idx: number) => {
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace") {
      const next = [...otp];
      if (next[idx]) {
        // Clear current box first
        next[idx] = "";
        setOtp(next);
      } else if (idx > 0) {
        // Move to previous box and clear it
        next[idx - 1] = "";
        setOtp(next);
        inputs.current[idx - 1]?.focus();
      }
    }
  };

  const selectTextOnFocus = (idx: number) => {
    // Force selection so next keystroke replaces the digit
    inputs.current[idx]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  const handleVerify = async () => {
    if (otp.join("").length !== 6) return;
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp.join(""));
      const user = useAuthStore.getState().user;

      // Clear the navigation stack by routing to the root index.
      // The index.tsx file will automatically read the user role and Redirect correctly,
      // completely resetting the stack so the back button works as expected.
      if (
        result.isNewUser ||
        !user?.profileComplete ||
        (!user?.idVerified && !user?.idSubmittedAt)
      ) {
        router.replace("/(auth)/complete-profile");
      } else if (!user.idVerified && user.idSubmittedAt) {
        router.replace("/(auth)/pending-verification");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Invalid OTP",
      );
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
        <View className="flex-1 px-6 pt-16 pb-10">
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text className="text-brand-text font-bold text-3xl mb-2">
              Verify OTP
            </Text>
            <Text className="text-brand-sub text-base mb-10">
              Sent to your registered number
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="flex-row justify-between gap-2 mb-10"
          >
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  if (r) inputs.current[i] = r;
                }}
                className="flex-1 h-16 bg-brand-card border border-brand-muted rounded-2xl text-brand-text font-bold text-2xl text-center"
                maxLength={1}
                keyboardType="number-pad"
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => selectTextOnFocus(i)}
                style={{ borderColor: digit ? "#6C47FF" : undefined }}
              />
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Button
              label="Verify & Continue"
              onPress={handleVerify}
              loading={loading}
              disabled={otp.join("").length !== 6}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
