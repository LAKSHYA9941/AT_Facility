import { View, Text } from "react-native";

type Props = { label?: string };

export default function Divider({ label }: Props) {
  if (!label) return <View className="h-px bg-brand-divider my-4" />;
  return (
    <View className="flex-row items-center gap-3 my-2">
      <View className="flex-1 h-px bg-brand-divider" />
      <Text className="text-brand-sub font-semibold text-xs tracking-widest uppercase">
        {label}
      </Text>
      <View className="flex-1 h-px bg-brand-divider" />
    </View>
  );
}