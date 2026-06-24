import { View, Text, Image } from "react-native";

type Props = { size?: "sm" | "md" | "lg" };

const sizes = {
  sm: { icon: "w-8 h-8 rounded-lg", text: "text-base" },
  md: { icon: "w-11 h-11 rounded-xl", text: "text-xl" },
  lg: { icon: "w-14 h-14 rounded-2xl", text: "text-2xl" },
};

export default function AppLogo({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`${s.icon} bg-white items-center justify-center overflow-hidden border border-brand-primary/10`}
        style={{
          elevation: 2,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        <Image
          source={require("../../assets/images/icon.jpeg")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <Text className={`text-brand-primary font-bold ${s.text} tracking-tight`}>
        A.T. Facility
      </Text>
    </View>
  );
}
