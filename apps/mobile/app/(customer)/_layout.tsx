import { Tabs, useRouter } from "expo-router";
import { Compass, Activity, User, Map, FileText } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { api } from "../../utils/api";
import { useAuthStore } from "../../store/auth";

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hasPendingBalance, setHasPendingBalance] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    const fetchTrips = async () => {
      try {
        const res = await api.get("/api/trips/my");
        const trips = res.data.data.trips || res.data.data;
        const pending = (Array.isArray(trips) ? trips : []).some(
          (t: any) =>
            t.balanceRemaining > 0 &&
            t.status !== "PENDING_PAYMENT" &&
            t.status !== "CANCELLED",
        );
        setHasPendingBalance(pending);
      } catch (e) {}
    };
    fetchTrips();
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      {hasPendingBalance && (
        <TouchableOpacity
          style={{
            paddingTop: insets.top,
            backgroundColor: "#fff7ed",
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#fdba74",
          }}
          onPress={() => router.push("/(customer)/activity")}
        >
          <Text
            style={{
              color: "#c2410c",
              fontWeight: "bold",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            You have a pending balance for a trip. Tap here to pay.
          </Text>
        </TouchableOpacity>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#DDE3ED",
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarActiveTintColor: "#1B4F8A",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        }}
      >
        {/* ── Visible tab screens ── */}
        <Tabs.Screen
          name="plan-trip"
          options={{
            title: "Plan Trip",
            tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="custom-plan"
          options={{
            title: "Custom Plan",
            tabBarIcon: ({ color, size }) => (
              <FileText size={size} color={color} />
            ),
          }}
        />
        {/* <Tabs.Screen
          name="travel"
          options={{
            title: "Travel",
            tabBarIcon: ({ color, size }) => (
              <Compass size={size} color={color} />
            ),
          }}
        /> */}
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: ({ color, size }) => (
              <Activity size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />

        {/* ── Booking-flow screens — hidden from tab bar ── */}
        <Tabs.Screen name="fleet-selection" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
        <Tabs.Screen name="trip-confirmed" options={{ href: null }} />
        <Tabs.Screen name="active-trip" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
