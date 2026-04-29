import { View, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "light" | "dark";
};

export default function ScreenWrapper({
  children,
  className,
  variant = "light",
}: Props) {
  const insets = useSafeAreaInsets();
  const bg = variant === "light" ? "bg-brand-bg" : "bg-brand-primary";

  return (
    <View
      className={`flex-1 ${bg} ${className ?? ""}`}
      style={{ paddingTop: insets.top }}
    >
      <StatusBar
        barStyle={variant === "light" ? "dark-content" : "light-content"}
        backgroundColor={variant === "light" ? "#EEF2F7" : "#1B4F8A"}
      />
      {children}
    </View>
  );
}
