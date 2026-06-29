import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View, TextInput, Alert } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import AppLogo from "../../components/ui/AppLogo";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useAuthStore } from "../../store/auth";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = useAuthStore((s) => s.sendOtp);

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (err: any) {
      Alert.alert(
        "Development Notice",
        "Login with phone is coming soon. Use bypass to test app flows.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper variant="light">
      <ScrollView
        className="flex-1 bg-[#EEF2F7]"
        contentContainerClassName="flex-grow justify-center px-5 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View className="items-center mb-8">
            <AppLogo size="md" />
          </View>

          <Card>
            {/* Heading */}
            <View className="mt-2 mb-6">
              <Text className="text-[#1B4F8A] font-bold text-2xl mb-1 text-center">
                Enter your phone number
              </Text>
              <Text className="text-[#9CA3AF] font-medium text-sm leading-5 text-center">
                We'll send you a verification code
              </Text>
            </View>

            {/* Form */}
            <View className="gap-5">
              <Animated.View entering={FadeInDown.delay(160).springify()}>
                <View className="flex-row items-center border border-[#DDE3ED] rounded-xl h-14 px-4 bg-white">
                  <Text className="text-sm font-bold text-gray-500 mr-2">
                    IN
                  </Text>
                  <Text className="text-base font-medium text-[#111827] mr-2">
                    +91
                  </Text>
                  <View className="w-[1px] h-6 bg-[#DDE3ED] mr-3" />
                  <TextInput
                    className="flex-1 text-base font-medium text-[#111827]"
                    placeholder="9999999999"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(280).springify()}>
                <Button
                  label="Send OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  disabled={phone.length !== 10}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(320).springify()}
                className="flex-row justify-center mt-2"
              >
                <Text className="text-[#9CA3AF] font-medium text-sm">
                  Don't have an account?{" "}
                </Text>
                <Text
                  className="text-[#1B4F8A] font-bold text-sm"
                  onPress={() => router.push("/(onboarding)/welcome")}
                >
                  Sign up
                </Text>
              </Animated.View>
            </View>

            {/* Footer */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text className="text-[#9CA3AF] text-xs text-center mt-6">
                By continuing you agree to our Terms & Privacy Policy
              </Text>
            </Animated.View>
          </Card>
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}
