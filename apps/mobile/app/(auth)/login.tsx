import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Divider from "../../components/ui/Divider";
import AppLogo from "../../components/ui/AppLogo";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const CREDS: Record<string, { pass: string; route: string }> = {
    customer: { pass: "1234", route: "/(customer)/ride" },
    driver: { pass: "1234", route: "/(driver)/home" },
    admin: { pass: "1234", route: "/(admin)/dashboard" },
  };

  const handleLogin = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);

    const cred = CREDS[email.trim().toLowerCase()];

    if (!cred) {
      alert("No account found for this ID");
      return;
    }

    if (password !== cred.pass) {
      alert("Wrong password");
      return;
    }

    router.replace(cred.route as any);
  };

  return (
    <ScreenWrapper variant="light">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-5 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Card>
            {/* Logo */}
            <AppLogo size="md" />

            {/* Heading */}
            <View className="mt-5 mb-8">
              <Text className="text-brand-primary font-bold text-2xl mb-1">
                Welcome Back
              </Text>
              <Text className="text-brand-sub font-medium text-sm leading-5">
                Log in to manage your rides and travel plans.
              </Text>
            </View>

            {/* Form */}
            <View className="gap-5">
              <Animated.View entering={FadeInDown.delay(160).springify()}>
                <Input
                  label="Email Address"
                  placeholder="alex@example.com"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(220).springify()}>
                <Input
                  label="Password"
                  rightLabel="Forgot Password?"
                  onRightLabelPress={() => {}}
                  placeholder="••••••••"
                  secure
                  value={password}
                  onChangeText={setPassword}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(280).springify()}>
                <Button
                  label="Log In"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={!email || !password}
                />
              </Animated.View>
            </View>

            {/* Divider */}
            <Animated.View
              entering={FadeInDown.delay(320).springify()}
              className="my-6"
            >
              <Divider label="or continue with" />
            </Animated.View>

            {/* Social buttons */}
            <Animated.View
              entering={FadeInDown.delay(360).springify()}
              className="flex-row gap-3"
            >
              <Button
                variant="social"
                label="Google"
                leftIcon={<Text className="text-base">G</Text>}
                onPress={() => {}}
              />
              <Button
                variant="social"
                label="Apple"
                leftIcon={<Text className="text-base">⌘</Text>}
                onPress={() => {}}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Divider />
              <View className="flex-row justify-center items-center gap-1">
                <Text className="text-brand-sub font-medium text-sm">
                  Don't have an account?
                </Text>
                <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
                  <Text className="text-brand-primary font-bold text-sm">
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-brand-sub text-xs text-center mt-6">
                © 2024 At Facility. All rights reserved.
              </Text>
            </Animated.View>
          </Card>
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}
