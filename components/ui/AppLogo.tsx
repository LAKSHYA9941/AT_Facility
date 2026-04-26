import { View, Text } from "react-native";

type Props = { size?: "sm" | "md" | "lg" };

const sizes = {
  sm: { icon: "w-8 h-8 rounded-lg", iconText: "text-lg", text: "text-base" },
  md: { icon: "w-11 h-11 rounded-xl", iconText: "text-2xl", text: "text-xl" },
  lg: { icon: "w-14 h-14 rounded-2xl", iconText: "text-3xl", text: "text-2xl" },
};

export default function AppLogo({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <View className="flex-row items-center gap-3">
      <View className={`${s.icon} bg-brand-primary items-center justify-center`}>
        <Text className={`${s.iconText}`}>🏢</Text>
      </View>
      <Text className={`text-brand-primary font-bold ${s.text} tracking-tight`}>
        @Facility
      </Text>
    </View>
  );
}