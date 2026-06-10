import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../../store/auth";
import { Briefcase, Car } from "lucide-react-native";

const ROLES = [
  {
    id: "CUSTOMER" as const,
    icon: Briefcase,
    title: "I'm a Rider",
    subtitle: "Book rides, packages & rentals",
  },
  {
    id: "DRIVER" as const,
    icon: Car,
    title: "I'm a Driver",
    subtitle: "Earn by driving on At Facility",
  },
];

export default function RoleSelectScreen() {
  const setSelectedRole = useAuthStore((s) => s.setSelectedRole);

  const handleSelect = (role: "CUSTOMER" | "DRIVER") => {
    setSelectedRole(role);
    router.push("/(auth)/phone");
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 px-6 pt-16 pb-10">
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          className="mb-10"
        >
          <Text className="text-brand-text font-bold text-3xl mb-2">
            Who are you?
          </Text>
          <Text className="text-brand-sub text-base">
            Choose your role to get started
          </Text>
        </Animated.View>

        <View className="gap-4">
          {ROLES.map((role, i) => (
            <Animated.View
              key={role.id}
              entering={FadeInDown.delay(140 + i * 80).springify()}
            >
              <TouchableOpacity
                onPress={() => handleSelect(role.id)}
                activeOpacity={0.8}
                className="bg-white border border-brand-border rounded-3xl p-5 flex-row items-center gap-4"
                style={{
                  shadowColor: "#1B4F8A",
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View className="w-16 h-16 rounded-2xl bg-brand-input items-center justify-center">
                  <role.icon size={28} color="#1B4F8A" />
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-lg">
                    {role.title}
                  </Text>
                  <Text className="text-brand-sub text-sm mt-1">
                    {role.subtitle}
                  </Text>
                </View>
                <Text className="text-brand-sub text-xl">›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.delay(320).springify()}
          className="mt-auto"
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-brand-sub text-center text-sm">
              ← Go back
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
