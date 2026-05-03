// import { Redirect } from "expo-router";
// import { useAuthStore } from "../store/auth";

// export default function Index() {
//   const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
//   if (isAuthenticated) return null; // initialize() handles routing
//   return <Redirect href="/(onboarding)/welcome" />;
// }

import { View, Text } from "react-native";
import { useAuthStore } from "../store/auth";

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  console.log(
    "📍 Index rendered → isLoading:",
    isLoading,
    "isAuthenticated:",
    isAuthenticated,
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#ff0000", // ← BRIGHT RED (impossible to miss)
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        TEST SCREEN{"\n"}
        If you see this RED screen → app is working!
      </Text>

      <Text style={{ color: "#fff", marginTop: 20, fontSize: 16 }}>
        isLoading: {String(isLoading)}
      </Text>
      <Text style={{ color: "#fff", fontSize: 16 }}>
        isAuthenticated: {String(isAuthenticated)}
      </Text>
    </View>
  );
}
