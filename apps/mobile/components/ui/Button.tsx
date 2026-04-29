import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Variant = "primary" | "outline" | "ghost" | "social";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
};

const styles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-brand-primary rounded-xl h-14 items-center justify-center",
    text: "text-white font-bold text-base tracking-wide",
  },
  outline: {
    container:
      "border border-brand-border bg-white rounded-xl h-14 flex-row items-center justify-center gap-3",
    text: "text-brand-text font-semibold text-base",
  },
  ghost: {
    container: "items-center justify-center py-2",
    text: "text-brand-sub font-medium text-sm",
  },
  social: {
    container:
      "border border-brand-border bg-white rounded-xl h-14 flex-row items-center justify-center gap-3 flex-1",
    text: "text-brand-text font-semibold text-base",
  },
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  leftIcon,
  className,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={animStyle}
      className={`${styles[variant].container} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#1B4F8A"} />
      ) : (
        <>
          {leftIcon}
          <Text className={styles[variant].text}>{label}</Text>
        </>
      )}
    </AnimatedTouchable>
  );
}
