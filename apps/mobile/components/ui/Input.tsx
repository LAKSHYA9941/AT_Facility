import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from "react-native";

type Props = TextInputProps & {
  label: string;
  rightLabel?: string;
  onRightLabelPress?: () => void;
  secure?: boolean;
  error?: string;
};

export default function Input({
  label,
  rightLabel,
  onRightLabelPress,
  secure,
  error,
  ...props
}: Props) {
  const [hidden, setHidden] = useState(secure ?? false);

  return (
    <View className="gap-2">
      {/* Label row */}
      <View className="flex-row justify-between items-center">
        <Text className="text-brand-text font-semibold text-xs tracking-widest uppercase">
          {label}
        </Text>
        {rightLabel && (
          <TouchableOpacity onPress={onRightLabelPress} activeOpacity={0.7}>
            <Text className="text-brand-link font-semibold text-sm">
              {rightLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Input field */}
      <View
        className={`flex-row items-center bg-brand-input border rounded-xl px-4 h-14 ${
          error ? "border-red-400" : "border-brand-border"
        }`}
      >
        <TextInput
          className="flex-1 text-brand-text font-medium text-base"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidden((p) => !p)}
            activeOpacity={0.7}
          >
            <Text className="text-brand-sub text-lg">
              {hidden ? "🙈" : "👁️"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text className="text-red-500 text-xs">{error}</Text>}
    </View>
  );
}
