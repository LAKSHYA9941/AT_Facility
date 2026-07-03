import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from "lucide-react-native";
import { getDestination } from "../../../data/destinations";

const BOOKING_URL = "https://at-facilities.vercel.app/contact";

export default function DestinationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const destination = getDestination(slug);

  if (!destination) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-brand-sub text-base">Destination not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 bg-brand-primary rounded-full"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBookNow = async () => {
    try {
      const supported = await Linking.canOpenURL(BOOKING_URL);
      if (supported) {
        await Linking.openURL(BOOKING_URL);
      } else {
        Alert.alert("Error", "Unable to open the booking page.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* ── Hero Image ──────────────────────────────────────────────────── */}
      <View style={{ height: 320 }}>
        {/* expo-image — avif support, caching, smooth transition */}
        <Image
          source={{ uri: destination.imageUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={400}
          cachePolicy="memory-disk"
        />

        {/* Overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        />

        {/* Top: back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ top: insets.top + 12, left: 16 }}
          className="absolute w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>

        {/* Bottom: name + state */}
        <View className="absolute bottom-0 left-0 right-0 p-5">
          <Text className="text-white text-2xl font-bold leading-tight">
            {destination.name}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-1">
            <MapPin size={13} color="rgba(255,255,255,0.85)" />
            <Text className="text-white/85 text-sm">{destination.state}</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable Content ──────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-5 pt-5">
          {/* Tagline */}
          <Text
            className="text-base text-brand-sub mb-4"
            style={{ fontStyle: "italic" }}
          >
            "{destination.tagline}"
          </Text>

          {/* Badges row */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-row items-center gap-1.5 bg-brand-bg rounded-full px-3 py-1.5">
              <Clock size={13} color="#1B4F8A" />
              <Text className="text-brand-primary text-xs font-semibold">
                {destination.duration}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-brand-bg rounded-full px-3 py-1.5">
              <Calendar size={13} color="#1B4F8A" />
              <Text className="text-brand-primary text-xs font-semibold">
                {destination.bestTime}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text className="text-sm text-brand-sub leading-6 mb-6">
            {destination.description}
          </Text>

          {/* Divider */}
          <View className="border-t border-brand-border mb-5" />

          {/* Highlights */}
          <Text className="text-base font-bold text-brand-text mb-3">
            Trip Highlights
          </Text>
          <View className="gap-3">
            {destination.highlights.map((h, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <CheckCircle2 size={18} color="#1B4F8A" />
                <Text className="text-sm text-brand-text flex-1">{h}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View className="border-t border-brand-border mt-6 mb-5" />

          {/* Booking note */}
          <View className="bg-blue-50 rounded-2xl p-4">
            <Text className="text-xs text-brand-sub leading-5">
              💬 This is a pre-planned package. Tap{" "}
              <Text className="font-semibold text-brand-primary">
                Book This Package
              </Text>{" "}
              below to contact our team — we'll customise dates, accommodation
              and transport to suit you.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Footer CTA ───────────────────────────────────────────── */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-brand-border px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <TouchableOpacity
          onPress={handleBookNow}
          activeOpacity={0.88}
          className="bg-brand-primary rounded-2xl py-4 flex-row items-center justify-center gap-2"
        >
          <ExternalLink size={18} color="#fff" />
          <Text className="text-white font-bold text-base">
            Book This Package
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
