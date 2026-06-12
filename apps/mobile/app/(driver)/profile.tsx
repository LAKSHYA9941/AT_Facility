import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Linking,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../../store/auth";
import { api } from "../../utils/api";
import {
  Mail,
  Phone,
  ChevronRight,
  X,
  Shield,
  FileText,
  Bell,
  MessageSquare,
  LogOut,
} from "lucide-react-native";

type ToggleItem = { icon: string; label: string; sub: string; key: string };
type MenuItemType = {
  icon: string;
  label: string;
  sub?: string;
  danger?: boolean;
  onPress?: () => void;
};

const TOGGLES: ToggleItem[] = [
  {
    icon: "bell",
    label: "Ride notifications",
    sub: "Sound alerts for new requests",
    key: "notifs",
  },
];

const getMenuIcon = (name: string, color = "#1B4F8A") => {
  switch (name) {
    case "bell":
      return <Bell size={18} color={color} />;
    case "help":
      return <MessageSquare size={18} color={color} />;
    case "terms":
      return <FileText size={18} color={color} />;
    case "logout":
      return <LogOut size={18} color="#ef4444" />;
    default:
      return <FileText size={18} color={color} />;
  }
};

function ToggleRow({
  item,
  value,
  onChange,
}: {
  item: ToggleItem;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-5 py-3.5 border-b border-brand-border">
      <View className="w-9 h-9 rounded-xl bg-brand-input items-center justify-center">
        {getMenuIcon(item.icon)}
      </View>
      <View className="flex-1">
        <Text className="text-brand-text font-semibold text-sm">
          {item.label}
        </Text>
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
        {getMenuIcon(item.icon, item.danger ? "#ef4444" : "#1B4F8A")}
      </View>
      <View className="flex-1">
        <Text
          className={`font-semibold text-sm ${item.danger ? "text-red-500" : "text-brand-text"}`}
        >
          {item.label}
        </Text>
        {item.sub && (
          <Text className="text-brand-sub text-xs mt-0.5">{item.sub}</Text>
        )}
      </View>
      {!item.danger && <Text className="text-brand-sub text-base">›</Text>}
    </TouchableOpacity>
  );
}

export default function DriverProfile() {
  const { user, logout } = useAuthStore();
  const [vehicle, setVehicle] = useState<any>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const [toggles, setToggles] = useState({
    notifs: true,
  });

  const setToggle = (key: string, val: boolean) =>
    setToggles((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await api.get("/api/driver/vehicle");
      if (res.data?.data) {
        setVehicle(res.data.data);
      }
    } catch (err) {
      console.log("Error fetching vehicle details:", err);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "D";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const menuItems: MenuItemType[] = [
    {
      icon: "help",
      label: "Help & support",
      onPress: () => setHelpVisible(true),
    },
    {
      icon: "terms",
      label: "Terms & conditions",
      onPress: () => setTermsVisible(true),
    },
    {
      icon: "logout",
      label: "Log out",
      danger: true,
      onPress: logout,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          className="bg-brand-primary px-5 pt-5 pb-6"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-sm">
              <Text className="text-brand-primary font-bold text-xl">
                {getInitials(user?.name)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                {user?.name || "Driver"}
              </Text>
              <Text className="text-white/70 text-xs mt-0.5">
                {user?.email || user?.phone || "No Email"}
              </Text>
              {user?.phone && user?.email && (
                <Text className="text-white/70 text-xs mt-0.5">
                  {user.phone}
                </Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/complete-profile")}
              className="border border-white/40 rounded-full px-3 py-1.5"
            >
              <Text className="text-white font-semibold text-xs">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle card inside header */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(driver)/vehicle")}
            className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex-row items-center gap-3 border border-white/10"
          >
            <View className="flex-1">
              {vehicle ? (
                <>
                  <Text className="text-white font-bold text-sm">
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text className="text-white/70 text-xs">
                    {vehicle.color} · {vehicle.plateNumber}
                  </Text>
                  <Text className="text-white/70 text-xs capitalize">
                    {vehicle.segment.replace("_", " ")} segment
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white font-bold text-sm">
                    No Vehicle Registered
                  </Text>
                  <Text className="text-white/70 text-xs">
                    Tap to register your vehicle now
                  </Text>
                </>
              )}
            </View>
            <Text className="text-white/50 text-lg">›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text className="text-brand-sub font-semibold text-xs px-5 pt-5 pb-2 uppercase tracking-widest">
            Preferences
          </Text>
          <View className="border-t border-brand-border">
            {TOGGLES.map((item) => (
              <ToggleRow
                key={item.key}
                item={item}
                value={toggles[item.key as keyof typeof toggles]}
                onChange={(v) => setToggle(item.key, v)}
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
            {menuItems.map((item) => (
              <MenuRow key={item.label} item={item} />
            ))}
          </View>
        </Animated.View>

        <Text className="text-brand-sub text-xs text-center py-6">
          At Facility Driver v1.0.0
        </Text>
      </ScrollView>

      {/* Help & Support Modal */}
      <Modal
        visible={helpVisible}
        animationType="slide"
        onRequestClose={() => setHelpVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#DDE3ED]">
            <Text className="text-lg font-bold text-brand-primary">
              Help & Support
            </Text>
            <TouchableOpacity
              onPress={() => setHelpVisible(false)}
              className="p-1 rounded-full bg-gray-100"
            >
              <X size={20} color="#1B4F8A" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-5 pt-6">
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Phone size={36} color="#1B4F8A" />
              </View>
              <Text className="text-xl font-bold text-[#111827]">
                Contact Us
              </Text>
              <Text className="text-sm text-gray-500 mt-1 text-center">
                Have questions or need assistance? We are available 24/7.
              </Text>
            </View>

            {/* Contact details list */}
            <View className="bg-gray-50 rounded-2xl p-5 border border-[#DDE3ED] mb-6">
              <TouchableOpacity
                onPress={() => Linking.openURL("tel:+919876543210")}
                className="flex-row items-center gap-4 py-3 border-b border-gray-100"
              >
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
                  <Phone size={20} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 font-semibold uppercase">
                    Phone Number
                  </Text>
                  <Text className="text-base text-brand-primary font-bold mt-0.5">
                    +91 98765 43210
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL("mailto:support@atfacility.com")}
                className="flex-row items-center gap-4 py-3"
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Mail size={20} color="#1B4F8A" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 font-semibold uppercase">
                    Email Address
                  </Text>
                  <Text className="text-base text-brand-primary font-bold mt-0.5">
                    support@atfacility.com
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Additional info */}
            <View className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
              <Text className="text-sm font-bold text-brand-primary mb-2">
                Corporate Office
              </Text>
              <Text className="text-xs text-brand-text leading-relaxed">
                At Facility Technologies Private Limited{"\n"}
                Building 4A, Tech Oasis, Sector 62{"\n"}
                Noida, Uttar Pradesh, India - 201301
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={termsVisible}
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#DDE3ED]">
            <Text className="text-lg font-bold text-brand-primary">
              Terms & Conditions
            </Text>
            <TouchableOpacity
              onPress={() => setTermsVisible(false)}
              className="p-1 rounded-full bg-gray-100"
            >
              <X size={20} color="#1B4F8A" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-5 pt-6 pb-10"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                <FileText size={32} color="#1B4F8A" />
              </View>
              <Text className="text-xl font-bold text-[#111827]">
                Driver Terms of Service
              </Text>
              <Text className="text-xs text-gray-400 mt-1">
                Last Updated: June 2026
              </Text>
            </View>

            <View className="gap-5 pb-10">
              <View>
                <Text className="text-base font-bold text-brand-primary mb-1">
                  1. Relationship with the Platform
                </Text>
                <Text className="text-sm text-brand-text leading-relaxed">
                  By registering as a driver on At Facility, you acknowledge
                  that you are an independent contractor and not an employee of
                  At Facility. You retain the sole discretion to accept or
                  reject ride requests.
                </Text>
              </View>

              <View>
                <Text className="text-base font-bold text-brand-primary mb-1">
                  2. Vehicle Requirements & Safety
                </Text>
                <Text className="text-sm text-brand-text leading-relaxed">
                  You agree to maintain your vehicle in a clean, sanitary, and
                  roadworthy condition. Your vehicle must satisfy all applicable
                  transport department regulations and possess active commercial
                  insurance and registration documents.
                </Text>
              </View>

              <View>
                <Text className="text-base font-bold text-brand-primary mb-1">
                  3. Driver Obligations & Conduct
                </Text>
                <Text className="text-sm text-brand-text leading-relaxed">
                  You agree to maintain a professional standard of behavior.
                  Safe driving, courtesy to passengers, and strict adherence to
                  traffic regulations are mandatory. Smoking, driving under the
                  influence, or verbal abuse will result in immediate
                  termination of platform privileges.
                </Text>
              </View>

              <View>
                <Text className="text-base font-bold text-brand-primary mb-1">
                  4. Payment Policy & Commission
                </Text>
                <Text className="text-sm text-brand-text leading-relaxed">
                  Fares are calculated based on the distance travelled and
                  pricing models established by At Facility. Upfront payments
                  are credited to your earnings wallet, while remaining cash
                  collections must be made directly from the passenger at the
                  completion of the ride. Platform commission fees are
                  automatically deducted from the wallet balance.
                </Text>
              </View>

              <View>
                <Text className="text-base font-bold text-brand-primary mb-1">
                  5. Limitation of Liability
                </Text>
                <Text className="text-sm text-brand-text leading-relaxed">
                  At Facility acts as a technology matchmaker and shall not be
                  held liable for any damages, traffic accidents, losses, or
                  disputes arising directly from rides facilitated by the
                  platform.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
