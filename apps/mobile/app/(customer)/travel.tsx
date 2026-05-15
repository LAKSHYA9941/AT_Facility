import { View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import TopBar from "../../components/layout/TopBar";
import SearchBar from "../../components/ui/SearchBar";
import CategoryChip from "../../components/ui/CategoryChip";
import SectionHeader from "../../components/ui/SectionHeader";
import TropicalCard from "../../components/travel/TropicalCard";
import MountainFeaturedCard from "../../components/travel/MountainFeaturedCard";
import MountainSmallCard from "../../components/travel/MountainSmallCard";
import CityCard from "../../components/travel/CityCard";
import { api } from "../../utils/api";

const CATEGORIES = [
  { id: "tropical", category: "BEACH", icon: "🏝️", label: "Tropical" },
  { id: "mountains", category: "HILLS", icon: "⛰️", label: "Mountains" },
  { id: "city", category: "CITYBREAK", icon: "🏙️", label: "City Tours" },
  { id: "adventure", category: "WILD", icon: "🧗", label: "Adventure" },
];

export default function TravelScreen() {
  const [activeCategory, setActiveCategory] = useState("tropical");
  const [loading, setLoading] = useState(true);
  const [tropical, setTropical] = useState<any[]>([]);
  const [mountains, setMountains] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const [beachRes, hillsRes, cityRes] = await Promise.all([
        api.get("/api/packages?category=BEACH"),
        api.get("/api/packages?category=HILLS"),
        api.get("/api/packages?category=CITYBREAK"),
      ]);

      setTropical(beachRes.data.data);
      setMountains(hillsRes.data.data);
      setCities(cityRes.data.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to fetch packages",
      );
    } finally {
      setLoading(false);
    }
  };

  const mapToTropical = (item: any) => ({
    id: item.id,
    title: item.title,
    days: item.durationDays,
    price: item.price,
    rating: 4.8, // Mocking rating as it's missing in DB
    image:
      item.imageUrls?.[0] ||
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600",
    onPress: () => router.push(`/package/${item.id}` as any), // Navigate to detail
  });

  const mapToMountainFeatured = (item: any) => ({
    title: item.title,
    subtitle: item.subtitle,
    price: item.price,
    image:
      item.imageUrls?.[0] ||
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
  });

  const mapToMountainSmall = (item: any) => ({
    id: item.id,
    title: item.title,
    price: `$${item.price} / person`,
    image:
      item.imageUrls?.[0] ||
      "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800",
  });

  const mapToCity = (item: any) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    price: item.price,
    rating: 4.7,
    discount: 0,
    image:
      item.imageUrls?.[0] ||
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600",
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top"]}>
      <TopBar title="At Facility" />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="pt-4">
          <SearchBar />
        </View>

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

        {loading ? (
          <ActivityIndicator size="large" color="#1B4F8A" className="mt-10" />
        ) : (
          <>
            {tropical.length > 0 && (
              <>
                <SectionHeader title="Tropical Getaways" onSeeAll={() => {}} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 4,
                  }}
                  className="mb-6"
                >
                  {tropical.map((item) => (
                    <TropicalCard key={item.id} {...mapToTropical(item)} />
                  ))}
                </ScrollView>
              </>
            )}

            {mountains.length > 0 && (
              <>
                <SectionHeader title="Mountain Escapes" onSeeAll={() => {}} />
                <MountainFeaturedCard
                  {...mapToMountainFeatured(mountains[0])}
                  onBook={() =>
                    router.push(`/package/${mountains[0].id}` as any)
                  }
                />
                {mountains.slice(1).map((item) => (
                  <MountainSmallCard
                    key={item.id}
                    {...mapToMountainSmall(item)}
                  />
                ))}
              </>
            )}

            {cities.length > 0 && (
              <View className="mt-2">
                <SectionHeader title="City Tours" onSeeAll={() => {}} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 4,
                  }}
                >
                  {cities.map((item) => (
                    <CityCard key={item.id} {...mapToCity(item)} />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
