import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

// ── Base Shimmer ──────────────────────────────────────────────

type ShimmerProps = {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.ease }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#DDE3ED",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ── Skeleton Variants ──────────────────────────────────────────

/**
 * Skeleton for a stat card (dashboard grid item)
 */
export function SkeletonStatCard() {
  return (
    <View style={styles.statCard}>
      <Shimmer width={32} height={32} borderRadius={8} />
      <Shimmer
        width={60}
        height={24}
        borderRadius={6}
        style={{ marginTop: 10 }}
      />
      <Shimmer
        width={80}
        height={12}
        borderRadius={4}
        style={{ marginTop: 6 }}
      />
    </View>
  );
}

/**
 * Skeleton for a list item with avatar + text lines
 */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Shimmer width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <Shimmer width="60%" height={14} borderRadius={4} />
        <Shimmer width="80%" height={10} borderRadius={4} />
        <Shimmer width="40%" height={10} borderRadius={4} />
      </View>
      <Shimmer width={50} height={20} borderRadius={10} />
    </View>
  );
}

/**
 * Skeleton for a document card in verify screen
 */
export function SkeletonDocCard() {
  return (
    <View style={styles.docCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Shimmer width={40} height={40} borderRadius={12} />
        <View style={{ flex: 1, gap: 6 }}>
          <Shimmer width="50%" height={14} borderRadius={4} />
          <Shimmer width="70%" height={10} borderRadius={4} />
        </View>
        <Shimmer width={60} height={22} borderRadius={11} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Shimmer width="48%" height={36} borderRadius={12} />
        <Shimmer width="48%" height={36} borderRadius={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton for the driver card in verify queue
 */
export function SkeletonDriverCard() {
  return (
    <View style={styles.driverCard}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#EEF2F7",
        }}
      >
        <Shimmer width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 6 }}>
          <Shimmer width="55%" height={14} borderRadius={4} />
          <Shimmer width="70%" height={10} borderRadius={4} />
          <Shimmer width="40%" height={10} borderRadius={4} />
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Shimmer width={30} height={16} borderRadius={4} />
          <Shimmer width={40} height={10} borderRadius={4} />
        </View>
      </View>
      {/* Progress bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Shimmer width="100%" height={8} borderRadius={4} />
      </View>
      {/* Review button */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Shimmer width={120} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton for the map screen
 */
export function SkeletonMapPlaceholder() {
  return (
    <View style={styles.mapPlaceholder}>
      <Shimmer width="100%" height={300} borderRadius={0} />
      <View style={{ padding: 16, gap: 8 }}>
        <Shimmer width="40%" height={14} borderRadius={4} />
        <Shimmer width="70%" height={10} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton for the bar chart in dashboard
 */
export function SkeletonBarChart() {
  return (
    <View style={styles.barChart}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Shimmer width={100} height={14} borderRadius={4} />
        <Shimmer width={70} height={14} borderRadius={4} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: 80,
        }}
      >
        {[40, 56, 48, 64, 72, 80, 52].map((h, i) => (
          <View key={i} style={{ alignItems: "center", flex: 1, gap: 4 }}>
            <Shimmer width={22} height={h} borderRadius={6} />
            <Shimmer width={18} height={8} borderRadius={3} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  statCard: {
    width: "47%",
    backgroundColor: "#EEF2F7",
    borderRadius: 16,
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  docCard: {
    borderWidth: 1,
    borderColor: "#DDE3ED",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  driverCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DDE3ED",
    borderRadius: 16,
    overflow: "hidden",
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#EEF2F7",
  },
  barChart: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#EEF2F7",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
});

export default Shimmer;
