import { TouchableOpacity, Text } from "react-native";

type Props = {
  label: string;
  icon: string;
  active?: boolean;
  onPress?: () => void;
};

export default function CategoryChip({ label, icon, active, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center gap-2 px-4 py-2 rounded-full border mr-2 ${
        active
          ? "bg-brand-primary border-brand-primary"
          : "bg-white border-brand-border"
      }`}
    >
      <Text className="text-sm">{icon}</Text>
      <Text className={`font-semibold text-sm ${active ? "text-white" : "text-brand-text"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}