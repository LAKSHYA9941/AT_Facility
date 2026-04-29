import { TouchableOpacity, ImageBackground, View, Text } from "react-native";

type Props = {
  title: string;
  price: string;
  image: string;
  onPress?: () => void;
};

export default function MountainSmallCard({
  title,
  price,
  image,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      className="mx-5 mb-3 h-32 rounded-2xl overflow-hidden"
    >
      <ImageBackground
        source={{ uri: image }}
        className="flex-1 justify-end"
        resizeMode="cover"
      >
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.32)" }}
        />
        <View className="p-3">
          <Text className="text-white font-bold text-sm">{title}</Text>
          <Text className="text-white/80 text-xs mt-0.5">{price}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
