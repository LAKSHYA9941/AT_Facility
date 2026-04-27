import { Tabs } from "expo-router";
import { LayoutDashboard, Users, ShieldCheck } from "lucide-react-native";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#DDE3ED",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#1B4F8A",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="users"     options={{ title: "Users",     tabBarIcon: ({ color, size }) => <Users       size={size} color={color} /> }} />
      <Tabs.Screen name="verify"    options={{ title: "Verify",    tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} /> }} />
    </Tabs>
  );
}