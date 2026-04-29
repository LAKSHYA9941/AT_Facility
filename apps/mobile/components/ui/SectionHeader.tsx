import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  title: string;
  onSeeAll?: () => void;
};

export default function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View className="flex-row items-center justify-between px-5 mb-3">
      <Text className="text-brand-text font-bold text-lg">{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text className="text-brand-primary font-semibold text-sm">
            See All →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
