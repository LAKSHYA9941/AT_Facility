import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useState } from "react";

const { width } = Dimensions.get("window");

export type CarouselItem = {
  id: string;
  /** Card background color */
  bg: string;
  /** Small muted label shown above the heading (e.g. "SPECIAL PROMO") */
  heading: string;
  /** Main bold title text */
  content: string;
  /** CTA button label */
  subContent: string;
  /** CTA button background color */
  accent?: string;
  /** Optional callback when CTA is pressed */
  onPress?: () => void;
};

type PromoCarouselProps = {
  items: CarouselItem[];
};

export default function PromoCarousel({ items }: PromoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View className="bg-white py-6">
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width - 40}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20 }}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <View
            style={{
              width: width - 40,
              backgroundColor: item.bg,
              borderRadius: 16,
              padding: 20,
              minHeight: 110,
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "600",
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                {item.heading}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "white",
                  fontWeight: "700",
                  lineHeight: 22,
                }}
              >
                {item.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={item.onPress}
              style={{
                backgroundColor: item.accent ?? "rgba(255,255,255,0.25)",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 6,
                alignSelf: "flex-start",
                marginTop: 12,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
                {item.subContent}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Dot indicators */}
      <View className="flex-row justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <View
            key={i}
            style={{
              width: activeIndex === i ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: activeIndex === i ? "#1B4F8A" : "#DDE3ED",
            }}
          />
        ))}
      </View>
    </View>
  );
}
