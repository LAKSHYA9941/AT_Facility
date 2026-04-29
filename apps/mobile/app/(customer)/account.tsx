import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

type MenuItem = {
  icon: string;
  label: string;
  sub?: string;
  badge?: string;
  danger?: boolean;
  toggle?: boolean;
  onPress?: () => void;
};

type Section = {
  title: string;
  items: MenuItem[];
};

const SECTIONS: Section[] = [
  {
    title: "Payments",
    items: [
      { icon: "💳", label: "Saved cards", sub: "Visa ···· 4242" },
      { icon: "👛", label: "Facility Wallet", sub: "₹340 available" },
      {
        icon: "🏷️",
        label: "Promo codes",
        sub: "FACILITY20 active",
        badge: "1",
      },
    ],
  },
  {
    title: "Trips",
    items: [
      { icon: "📍", label: "Saved addresses", sub: "Home, Office" },
      { icon: "⭐", label: "Favourite drivers", sub: "3 drivers" },
      { icon: "🔔", label: "Ride notifications", toggle: true },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: "🔒", label: "Aadhaar verification", sub: "Verified ✓" },
      { icon: "🛡️", label: "Privacy & safety" },
      { icon: "🌐", label: "Language", sub: "English" },
      { icon: "⭐", label: "Rate the app" },
      { icon: "💬", label: "Help & support" },
    ],
  },
  {
    title: "Danger zone",
    items: [
      {
        icon: "🚪",
        label: "Log out",
        danger: true,
        onPress: () => router.replace("/(auth)/login"),
      },
      { icon: "🗑️", label: "Delete account", danger: true },
    ],
  },
];

function MenuRow({ item }: { item: MenuItem }) {
  const [toggled, setToggled] = useState(true);

  return (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={item.toggle ? 1 : 0.7}
      className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border"
    >
      <View className="w-9 h-9 rounded-xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
      </View>
      <View className="flex-1">
        <Text
          className={`font-semibold text-sm ${
            item.danger ? "text-red-500" : "text-brand-text"
          }`}
        >
          {item.label}
        </Text>
        {item.sub && (
          <Text className="text-brand-sub text-xs mt-0.5">{item.sub}</Text>
        )}
      </View>
      {item.badge && (
        <View className="bg-brand-primary rounded-full w-5 h-5 items-center justify-center mr-1">
          <Text className="text-white text-xs font-bold">{item.badge}</Text>
        </View>
      )}
      {item.toggle ? (
        <Switch
          value={toggled}
          onValueChange={setToggled}
          trackColor={{ false: "#DDE3ED", true: "#1B4F8A" }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      ) : (
        !item.danger && <Text className="text-brand-sub text-base">›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          className="bg-brand-primary px-5 pt-5 pb-6"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
              <Text className="text-brand-primary font-bold text-xl">RK</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">Rahul Kumar</Text>
              <Text className="text-white/70 text-xs mt-0.5">
                rahul@atfacility.com
              </Text>
              <Text className="text-white/70 text-xs">+91 98100 XXXXX</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              className="border border-white/40 rounded-full px-3 py-1.5"
            >
              <Text className="text-white font-semibold text-xs">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Wallet strip inside header */}
          <View className="flex-row items-center justify-between mt-4 bg-white/10 rounded-2xl px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Text style={{ fontSize: 16 }}>👛</Text>
              <View>
                <Text className="text-white/70 text-xs">Facility Wallet</Text>
                <Text className="text-white font-bold text-sm">₹340.00</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-white rounded-full px-4 py-1.5"
            >
              <Text className="text-brand-primary font-bold text-xs">
                Add Money
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(120 + si * 60).springify()}
          >
            <Text className="text-brand-sub font-semibold text-xs px-5 pt-5 pb-2 tracking-widest uppercase">
              {section.title}
            </Text>
            <View className="border-t border-brand-border">
              {section.items.map((item) => (
                <MenuRow key={item.label} item={item} />
              ))}
            </View>
          </Animated.View>
        ))}

        {/* App version */}
        <Text className="text-brand-sub text-xs text-center py-6">
          At Facility v1.0.0 · © 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
