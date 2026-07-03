import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { MapPin } from "lucide-react-native";
import type { Destination } from "../../data/destinations";

type Props = {
  destination: Destination;
  onPress: () => void;
};

export default function DestinationCard({ destination, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="w-52 h-64 rounded-2xl overflow-hidden mr-3"
    >
      <ImageBackground
        source={{ uri: destination.imageUrl }}
        className="flex-1 justify-end"
        resizeMode="cover"
      >
        {/* Subtle full-card tint */}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
          pointerEvents="none"
        />

        {/* Strong gradient at the bottom for text readability */}
        <View
          className="absolute bottom-0 left-0 right-0"
          style={{ height: 130, backgroundColor: "rgba(0,0,0,0.50)" }}
          pointerEvents="none"
        />

        {/* Duration badge — top right */}
        <View
          className="absolute top-3 right-3 rounded-full px-2.5 py-1"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <Text className="text-white text-xs font-semibold">
            {destination.duration}
          </Text>
        </View>

        {/* Bottom content */}
        <View className="p-3">
          <Text
            className="text-white font-bold text-base leading-tight"
            numberOfLines={1}
          >
            {destination.name}
          </Text>
          <Text className="text-white/80 text-xs mt-0.5" numberOfLines={1}>
            {destination.tagline}
          </Text>
          <View className="flex-row items-center gap-1 mt-2">
            <MapPin size={10} color="rgba(255,255,255,0.75)" />
            <Text className="text-white/75 text-xs">{destination.state}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
