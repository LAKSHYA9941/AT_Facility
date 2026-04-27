import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

type ToggleItem = { icon: string; label: string; sub: string; key: string };
type MenuItemType = { icon: string; label: string; sub?: string; danger?: boolean; onPress?: () => void };

const TOGGLES: ToggleItem[] = [
  { icon: "🛣️", label: "Outstation rides",   sub: "Accept rides beyond city limits", key: "outstation" },
  { icon: "👥", label: "Shared rides",        sub: "Allow multiple passengers",       key: "shared" },
  { icon: "🔔", label: "Ride notifications",  sub: "Sound alerts for new requests",   key: "notifs" },
];

const MENU: MenuItemType[] = [
  { icon: "⭐", label: "My ratings & reviews", sub: "4.9 avg · 142 reviews" },
  { icon: "📊", label: "Performance stats",    sub: "Acceptance rate, cancellations" },
  { icon: "💬", label: "Help & support" },
  { icon: "📋", label: "Terms & conditions" },
  { icon: "🚪", label: "Log out", danger: true, onPress: () => router.replace("/(auth)/login") },
];

function ToggleRow({ item, value, onChange }: { item: ToggleItem; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border">
      <View className="w-9 h-9 rounded-xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-semibold text-sm">{item.label}</Text>
        <Text className="text-brand-sub text-xs mt-0.5">{item.sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#DDE3ED", true: "#1B4F8A" }}
        thumbColor="#fff"
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
      />
    </View>
  );
}

function MenuRow({ item }: { item: MenuItemType }) {
  return (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.7}
      className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border"
    >
      <View className="w-9 h-9 rounded-xl bg-brand-input items-center justify-center">
        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
      </View>
      <View className="flex-1">
        <Text className={`font-semibold text-sm ${item.danger ? "text-red-500" : "text-brand-text"}`}>
          {item.label}
        </Text>
        {item.sub && <Text className="text-brand-sub text-xs mt-0.5">{item.sub}</Text>}
      </View>
      {!item.danger && <Text className="text-brand-sub text-base">›</Text>}
    </TouchableOpacity>
  );
}

export default function DriverProfile() {
  const [toggles, setToggles] = useState({ outstation: true, shared: false, notifs: true });

  const setToggle = (key: string, val: boolean) =>
    setToggles(prev => ({ ...prev, [key]: val }));

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
              <Text className="text-white font-bold text-lg">Ravi Kumar</Text>
              <Text className="text-white/70 text-xs mt-0.5">ravi@atfacility.com</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-yellow-400 text-xs">★★★★★</Text>
                <Text className="text-white/70 text-xs">4.9 · 142 trips</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              className="border border-white/40 rounded-full px-3 py-1.5"
            >
              <Text className="text-white font-semibold text-xs">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle card inside header */}
          <View className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex-row items-center gap-3">
            <Text style={{ fontSize: 24 }}>🚙</Text>
            <View>
              <Text className="text-white font-bold text-sm">Maruti Swift Dzire</Text>
              <Text className="text-white/70 text-xs">White · DL 01 CA 1234</Text>
              <Text className="text-white/70 text-xs">Shaana Babu segment</Text>
            </View>
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text className="text-brand-sub font-semibold text-xs px-5 pt-5 pb-2 uppercase tracking-widest">
            Preferences
          </Text>
          <View className="border-t border-brand-border">
            {TOGGLES.map(item => (
              <ToggleRow
                key={item.key}
                item={item}
                value={toggles[item.key as keyof typeof toggles]}
                onChange={v => setToggle(item.key, v)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text className="text-brand-sub font-semibold text-xs px-5 pt-5 pb-2 uppercase tracking-widest">
            More
          </Text>
          <View className="border-t border-brand-border">
            {MENU.map(item => <MenuRow key={item.label} item={item} />)}
          </View>
        </Animated.View>

        <Text className="text-brand-sub text-xs text-center py-6">
          At Facility Driver v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}