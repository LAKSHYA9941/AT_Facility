import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  onMenuPress?: () => void;
  onNotifPress?: () => void;
};

export default function TopBar({ title, onMenuPress, onNotifPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3 bg-white"
      style={{ paddingTop: insets.top + 8 }}
    >
      <TouchableOpacity onPress={onMenuPress} activeOpacity={0.7}>
        <Text className="text-2xl">☰</Text>
      </TouchableOpacity>
      <Text className="text-brand-primary font-bold text-lg">{title}</Text>
      <TouchableOpacity onPress={onNotifPress} activeOpacity={0.7}>
        <View>
          <Text className="text-2xl">🔔</Text>
          <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-primary rounded-full" />
        </View>
      </TouchableOpacity>
    </View>
  );
}