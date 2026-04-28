import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import Button from "../ui/Button";

type Props = {
  title: string;
  subtitle: string;
  price: number;
  image: string;
  onBook?: () => void;
};

export default function MountainFeaturedCard({ title, subtitle, price, image, onBook }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.95} className="mx-5 mb-3 h-44 rounded-2xl overflow-hidden">
      <ImageBackground source={{ uri: image }} className="flex-1 justify-end" resizeMode="cover">
        <View className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.38)" }} />
        <View className="p-4 flex-row items-end justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-white font-bold text-base mb-1">{title}</Text>
            <Text className="text-white/80 text-xs leading-4">{subtitle}</Text>
            <Text className="text-white font-bold text-lg mt-2">${price.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            onPress={onBook}
            activeOpacity={0.85}
            className="bg-brand-primary rounded-full px-5 py-2"
          >
            <Text className="text-white font-bold text-sm">Book Now</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}