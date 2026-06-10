import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { Star } from "lucide-react-native";

type Props = {
  title: string;
  subtitle: string;
  price: number;
  rating?: number;
  image: string;
  discount?: number;
  onPress?: () => void;
};

export default function CityCard({
  title,
  subtitle,
  price,
  rating,
  image,
  discount,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      className="w-44 mr-3"
    >
      <View className="h-36 rounded-2xl overflow-hidden mb-2">
        <ImageBackground
          source={{ uri: image }}
          className="flex-1"
          resizeMode="cover"
        >
          {discount && (
            <View className="absolute top-2 right-2 bg-brand-primary rounded-lg px-2 py-0.5">
              <Text className="text-white font-bold text-xs">-{discount}%</Text>
            </View>
          )}
        </ImageBackground>
      </View>
      <Text className="text-brand-text font-bold text-sm">{title}</Text>
      <Text className="text-brand-sub text-xs mt-0.5">{subtitle}</Text>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-brand-primary font-bold text-sm">${price}</Text>
        {rating && (
          <View className="flex-row items-center gap-1">
            <Star size={12} color="#EAB308" fill="#EAB308" />
            <Text className="text-brand-sub text-xs">{rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
