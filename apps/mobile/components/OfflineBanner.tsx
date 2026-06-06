// apps/mobile/components/OfflineBanner.tsx
// Add this to your root _layout.tsx so it appears app-wide.
//
// Installation:
//   npx expo install @react-native-community/netinfo
//
// Usage in _layout.tsx:
//   import { OfflineBanner } from "../components/OfflineBanner";
//   // inside your root layout JSX, add <OfflineBanner /> at the top level

import React, { useEffect, useState, useRef } from "react";
import { View, Text, Animated as RNAnimated } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const translateY = useRef(new RNAnimated.Value(-60)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      setIsOffline(offline);
      if (offline) setWasOffline(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOffline) {
      // Slide down + fade in
      RNAnimated.parallel([
        RNAnimated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline) {
      // Back online — show brief green "Back online" then slide away
      setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(translateY, {
            toValue: -60,
            duration: 350,
            useNativeDriver: true,
          }),
          RNAnimated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setWasOffline(false));
      }, 1500);
    }
  }, [isOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <RNAnimated.View
      style={{
        transform: [{ translateY }],
        opacity,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: isOffline ? "#1F2937" : "#065F46",
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 8,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isOffline ? "#EF4444" : "#10B981",
        }}
      />
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
        {isOffline ? "No internet connection" : "Back online"}
      </Text>
    </RNAnimated.View>
  );
}
