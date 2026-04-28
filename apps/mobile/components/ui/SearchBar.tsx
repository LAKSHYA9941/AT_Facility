import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  placeholder?: string;
  onPress?: () => void;
};

export default function SearchBar({ placeholder = "Where do you want to go?", onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mx-5 mb-4 flex-row items-center bg-white border border-brand-border rounded-2xl px-4 h-12 gap-3"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <Text className="text-brand-sub text-base">🔍</Text>
      <Text className="text-brand-sub font-medium text-sm flex-1">{placeholder}</Text>
    </TouchableOpacity>
  );
}