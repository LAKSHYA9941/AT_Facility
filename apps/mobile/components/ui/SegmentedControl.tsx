import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export default function SegmentedControl({
  options,
  selectedValue,
  onValueChange,
  className = "",
}: Props): React.JSX.Element {
  return (
    <View
      className={`flex-row bg-gray-100 rounded-2xl p-1 ${className}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {options.map((option) => {
        const isActive = option === selectedValue;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            onPress={() => onValueChange(option)}
            className={`flex-1 py-3 items-center rounded-xl ${
              isActive ? "bg-white" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                isActive ? "text-[#1B4F8A]" : "text-gray-500"
              }`}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
