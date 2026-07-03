import { Stack } from "expo-router";

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      {/* The tab bar lives inside (tabs)/_layout.tsx */}
      <Stack.Screen name="(tabs)" />

      {/* Detail / flow screens — pushed on top of tabs with real back navigation */}
      <Stack.Screen name="fleet-selection" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="trip-confirmed" />
      <Stack.Screen name="active-trip" />
      <Stack.Screen name="destination/[slug]" />
    </Stack>
  );
}
