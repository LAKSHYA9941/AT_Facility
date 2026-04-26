import { View, Text, TouchableOpacity, ImageBackground } from "react-native";

type Props = {
  title: string;
  days: number;
  price: number;
  rating: number;
  image: string; // uri
  onPress?: () => void;
};

export default function TropicalCard({ title, days, price, rating, image, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      className="w-56 h-52 rounded-2xl overflow-hidden mr-3"
    >
      <ImageBackground
        source={{ uri: image }}
        className="flex-1 justify-end"
        resizeMode="cover"
      >
        {/* gradient overlay */}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
        />
        <View className="p-3 gap-1">
          <Text className="text-white font-bold text-sm">{title}</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
              <Text className="text-yellow-400 text-xs">★ {rating}</Text>
              <Text className="text-white text-xs">  {days} days</Text>
            </View>
            <View>
              <Text className="text-white text-xs opacity-80">From</Text>
              <Text className="text-white font-bold text-sm">${price.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}