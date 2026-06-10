import React, { useState, useCallback } from "react";
import {
  Image,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { AlertTriangle } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from "react-native-reanimated";

type LazyImageProps = {
  uri: string | null | undefined;
  width: number;
  height: number;
  borderRadius?: number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  onPress?: () => void;
  resizeMode?: "cover" | "contain" | "stretch";
};

export default function LazyImage({
  uri,
  width,
  height,
  borderRadius = 8,
  style,
  containerStyle,
  onPress,
  resizeMode = "cover",
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const shimmerOpacity = useSharedValue(0.3);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(false);
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setLoaded(false);
    setRetryKey((prev) => prev + 1);
  }, []);

  const Wrapper = onPress ? TouchableOpacity : View;

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width, height, borderRadius },
          containerStyle,
        ]}
      >
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        { width, height, borderRadius, overflow: "hidden" },
        containerStyle,
      ]}
    >
      {/* Skeleton placeholder */}
      {!loaded && !error && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#DDE3ED", borderRadius },
            shimmerStyle,
          ]}
        />
      )}

      {/* Error state */}
      {error && (
        <TouchableOpacity
          onPress={retry}
          activeOpacity={0.8}
          style={[
            StyleSheet.absoluteFill,
            styles.errorContainer,
            { borderRadius },
          ]}
        >
          <AlertTriangle size={20} color="#A32D2D" />
          <Text style={styles.errorText}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Actual image */}
      {!error && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={StyleSheet.absoluteFill}
        >
          <Image
            key={retryKey}
            source={{ uri }}
            style={[
              {
                width,
                height,
                borderRadius,
              },
              style,
            ]}
            resizeMode={resizeMode}
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#FCEBEB",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  errorIcon: {
    fontSize: 20,
  },
  errorText: {
    color: "#A32D2D",
    fontSize: 10,
    fontWeight: "600",
  },
});
