import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import TopBar from "../../components/layout/TopBar";
import SectionHeader from "../../components/ui/SectionHeader";
import DestinationCard from "../../components/travel/DestinationCard";
import {
  destinations,
  categoryMeta,
  type Category,
} from "../../data/destinations";

const CATEGORY_ORDER: Category[] = [
  "himalayas",
  "spiritual",
  "heritage",
  "honeymoon",
];

export default function TravelScreen() {
  const insets = useSafeAreaInsets();

  const byCategory = (cat: Category) =>
    destinations.filter((d) => d.category === cat);

  return (
    <View className="flex-1 bg-brand-bg" style={{ paddingTop: insets.top }}>
      <TopBar title="At Facility" />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero header */}
        <View className="px-5 pt-5 pb-2">
          <Text className="text-2xl font-bold text-brand-text">
            Explore Packages
          </Text>
          <Text className="text-brand-sub text-sm mt-1">
            Curated pre-planned trips across North India
          </Text>
        </View>

        {/* Category sections */}
        {CATEGORY_ORDER.map((cat) => {
          const meta = categoryMeta[cat];
          const items = byCategory(cat);
          return (
            <View key={cat} className="mt-4">
              {/* Section header with emoji */}
              <View className="px-5 mb-3">
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                  <View>
                    <Text className="text-base font-bold text-brand-text">
                      {meta.label}
                    </Text>
                    <Text className="text-xs text-brand-sub">{meta.blurb}</Text>
                  </View>
                </View>
              </View>

              {/* Horizontal scroll of cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 8,
                }}
              >
                {items.map((destination) => (
                  <DestinationCard
                    key={destination.slug}
                    destination={destination}
                    onPress={() =>
                      router.push(
                        `/(customer)/destination/${destination.slug}` as any,
                      )
                    }
                  />
                ))}
              </ScrollView>

              {/* Divider between sections */}
              <View className="mx-5 mt-3 border-b border-brand-border" />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
