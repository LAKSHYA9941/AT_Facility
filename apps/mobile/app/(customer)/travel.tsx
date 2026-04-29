import { View, ScrollView } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/layout/TopBar";
import SearchBar from "../../components/ui/SearchBar";
import CategoryChip from "../../components/ui/CategoryChip";
import SectionHeader from "../../components/ui/SectionHeader";
import TropicalCard from "../../components/travel/TropicalCard";
import MountainFeaturedCard from "../../components/travel/MountainFeaturedCard";
import MountainSmallCard from "../../components/travel/MountainSmallCard";
import CityCard from "../../components/travel/CityCard";

const CATEGORIES = [
  { id: "tropical", icon: "🏝️", label: "Tropical" },
  { id: "mountains", icon: "⛰️", label: "Mountains" },
  { id: "city", icon: "🏙️", label: "City Tours" },
  { id: "adventure", icon: "🧗", label: "Adventure" },
];

const TROPICAL = [
  {
    id: "1",
    title: "Maldives Retreat",
    days: 5,
    price: 1299,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600",
  },
  {
    id: "2",
    title: "Bali Serenity",
    days: 7,
    price: 980,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600",
  },
  {
    id: "3",
    title: "Phuket Escape",
    days: 6,
    price: 850,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=600",
  },
];

const MOUNTAIN_FEATURED = {
  title: "Swiss Alps Adventure",
  subtitle: "Experience the peak of luxury in the heart of Europe.",
  price: 2400,
  image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
};

const MOUNTAIN_SMALL = [
  {
    id: "1",
    title: "Aspen Sky Lodge",
    price: "$1,100 / Week",
    image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800",
  },
  {
    id: "2",
    title: "Dolomite Trekking",
    price: "$750 / person",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
  },
];

const CITY = [
  {
    id: "1",
    title: "Tokyo Modernity",
    subtitle: "Explore the future of cities.",
    price: 450,
    rating: 4.7,
    discount: 20,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600",
  },
  {
    id: "2",
    title: "Paris Romance",
    subtitle: "The city of light.",
    price: 600,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
  },
  {
    id: "3",
    title: "NYC Energy",
    subtitle: "The city that never sleeps.",
    price: 720,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600",
  },
];

export default function TravelScreen() {
  const [activeCategory, setActiveCategory] = useState("tropical");

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top"]}>
      <TopBar title="At Facility" />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Search */}
        <View className="pt-4">
          <SearchBar />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              icon={c.icon}
              label={c.label}
              active={activeCategory === c.id}
              onPress={() => setActiveCategory(c.id)}
            />
          ))}
        </ScrollView>

        {/* Tropical Getaways */}
        <SectionHeader title="Tropical Getaways" onSeeAll={() => {}} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
          className="mb-6"
        >
          {TROPICAL.map((item) => (
            <TropicalCard key={item.id} {...item} />
          ))}
        </ScrollView>

        {/* Mountain Escapes */}
        <SectionHeader title="Mountain Escapes" onSeeAll={() => {}} />
        <MountainFeaturedCard {...MOUNTAIN_FEATURED} onBook={() => {}} />
        {MOUNTAIN_SMALL.map((item) => (
          <MountainSmallCard key={item.id} {...item} />
        ))}

        {/* City Tours */}
        <View className="mt-2">
          <SectionHeader title="City Tours" onSeeAll={() => {}} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
          >
            {CITY.map((item) => (
              <CityCard key={item.id} {...item} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
