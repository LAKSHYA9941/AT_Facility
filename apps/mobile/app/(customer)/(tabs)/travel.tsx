import React, { useMemo, useCallback } from "react";
import { View, Text, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import TopBar from "../../../components/layout/TopBar";
import DestinationCard from "../../../components/travel/DestinationCard";
import {
  destinations,
  categoryMeta,
  type Category,
  type Destination,
} from "../../../data/destinations";

const CATEGORY_ORDER: Category[] = [
  "himalayas",
  "spiritual",
  "heritage",
  "honeymoon",
];

type SectionData = {
  category: Category;
  label: string;
  emoji: string;
  blurb: string;
  items: Destination[];
};

/** Pre-compute sections once — avoids .filter() on every render */
function buildSections(): SectionData[] {
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    ...categoryMeta[cat],
    items: destinations.filter((d) => d.category === cat),
  }));
}

/** Horizontal card row for a single category — memoised to avoid re-renders */
const CategoryRow = React.memo(function CategoryRow({
  section,
  onCardPress,
}: {
  section: SectionData;
  onCardPress: (slug: string) => void;
}) {
  const renderCard = useCallback(
    ({ item }: { item: Destination }) => (
      <DestinationCard
        destination={item}
        onPress={() => onCardPress(item.slug)}
      />
    ),
    [onCardPress],
  );

  const keyExtractor = useCallback((item: Destination) => item.slug, []);

  return (
    <View style={{ marginTop: 16 }}>
      {/* Section header with emoji */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20 }}>{section.emoji}</Text>
          <View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#111827",
              }}
            >
              {section.label}
            </Text>
            <Text style={{ fontSize: 11, color: "#6B7280" }}>
              {section.blurb}
            </Text>
          </View>
        </View>
      </View>

      {/* Horizontal FlatList — only renders visible cards */}
      <FlatList
        horizontal
        data={section.items}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        // Performance: don't measure every frame
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {/* Divider */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      />
    </View>
  );
});

export default function TravelScreen() {
  const insets = useSafeAreaInsets();

  // Build sections once, never re-computed (static data)
  const sections = useMemo(buildSections, []);

  const handleCardPress = useCallback((slug: string) => {
    router.push(`/(customer)/destination/${slug}` as any);
  }, []);

  const renderSection = useCallback(
    ({ item }: { item: SectionData }) => (
      <CategoryRow section={item} onCardPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((item: SectionData) => item.category, []);

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F5F6FA", paddingTop: insets.top }}
    >
      <TopBar title="At Facility" />

      {/* Hero header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 8,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
          Explore Packages
        </Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Curated pre-planned trips across North India
        </Text>
      </View>

      {/* Vertical FlatList of category sections — lazy renders off-screen sections */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, backgroundColor: "#fff" }}
        // Performance
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
    </View>
  );
}
