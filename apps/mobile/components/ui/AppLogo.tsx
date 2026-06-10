import { View, Text } from "react-native";
import { Building2 } from "lucide-react-native";

type Props = { size?: "sm" | "md" | "lg" };

const sizes = {
  sm: { icon: "w-8 h-8 rounded-lg", iconSize: 16, text: "text-base" },
  md: { icon: "w-11 h-11 rounded-xl", iconSize: 22, text: "text-xl" },
  lg: { icon: "w-14 h-14 rounded-2xl", iconSize: 28, text: "text-2xl" },
};

export default function AppLogo({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`${s.icon} bg-brand-primary items-center justify-center`}
      >
        <Building2 size={s.iconSize} color="#fff" />
      </View>
      <Text className={`text-brand-primary font-bold ${s.text} tracking-tight`}>
        A.T. Facility
      </Text>
    </View>
  );
}
