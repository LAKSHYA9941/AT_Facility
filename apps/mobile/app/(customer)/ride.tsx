import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { MapplsGL } from "../../utils/mappls";
import TopBar from "../../components/layout/TopBar";
import { MapPin } from "lucide-react-native";

const { width } = Dimensions.get("window");

const CAROUSEL = [
  {
    id: "1",
    tag: "SPECIAL PROMO",
    title: "50% off your pehli\nBijli ride ⚡",
    cta: "Claim Karo",
    bg: "#1B4F8A",
    accent: "#3b82f6",
  },
  {
    id: "2",
    tag: "WEEKEND VIBES",
    title: "Nawab Sahab at\nSedan price 👑",
    cta: "Book Abhi",
    bg: "#3B3486",
    accent: "#7C3AED",
  },
  {
    id: "3",
    tag: "REFER & EARN",
    title: "Dost ko bulao,\n₹200 pao 🤝",
    cta: "Share Karo",
    bg: "#855C0B",
    accent: "#D97706",
  },
];

const FLEET = [
  {
    id: "1",
    name: "Chhotu Express",
    hindi: "छोटू एक्सप्रेस",
    sub: "Affordable, gets you there",
    eta: "3 mins",
    price: "18 /km",
    emoji: "🚗",
  },
  {
    id: "2",
    name: "Shaana Babu",
    hindi: "शाना बाबू",
    sub: "Dressed up, AC, pro driver",
    eta: "5 mins",
    price: "32 /km",
    emoji: "🚙",
  },
  {
    id: "3",
    name: "Rath",
    hindi: "नवाब साहब",
    sub: "Full filmy, enters with BGM",
    eta: "8 mins",
    price: "68 /km",
    emoji: "🏎️",
  },
  {
    id: "4",
    name: "Baaraati",
    hindi: "बाराती",
    sub: "Whole squad, no questions",
    eta: "10 mins",
    price: "42 /km",
    emoji: "🚐",
  },
  {
    id: "5",
    name: "Bijli",
    hindi: "बिजली ⚡",
    sub: "Aati kya Khandala, silently",
    eta: "6 mins",
    price: "15 /km",
    emoji: "🔋",
  },
  {
    id: "6",
    name: "Apni Marzi",
    hindi: "अपनी मर्ज़ी",
    sub: "Self-drive, main apna dost",
    eta: "Now",
    price: "999 /km",
    emoji: "🔑",
  },
];

export default function RideScreen() {
  const [selectedFleet, setSelectedFleet] = useState(FLEET[0]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  return (
    <View className="flex-1 bg-white">
      {/* MAP — top ~35% of screen */}
      <View style={{ height: 260 }}>
        <MapplsGL.MapView
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          logoEnabled={true}
          compassEnabled={true}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          <MapplsGL.Camera
            zoomLevel={12}
            centerCoordinate={[77.209, 28.6139]}
            animationMode="flyTo"
            animationDuration={1000}
          />
          <MapplsGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
        </MapplsGL.MapView>
        {/* Topbar overlay */}
        <SafeAreaView
          edges={["top"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <View className="flex-row items-center justify-between px-5 py-3">
            <TouchableOpacity activeOpacity={0.7}>
              <View className="gap-1">
                <View className="w-5 h-0.5 bg-brand-primary" />
                <View className="w-5 h-0.5 bg-brand-primary" />
                <View className="w-5 h-0.5 bg-brand-primary" />
              </View>
            </TouchableOpacity>
            <View className="bg-white/90 px-4 py-1.5 rounded-full">
              <Text className="text-brand-primary font-bold text-base">
                At Facility
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <View className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
                <Text className="text-lg">🔔</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Location inputs floating on map */}
        <View
          className="absolute left-4 right-4 bg-white rounded-2xl px-4 py-3"
          style={{
            bottom: 30,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <View className="flex-row items-center gap-3 pb-3 border-b border-brand-border">
            <MapPin size={16} color="#1B4F8A" />
            <Text
              className="text-brand-text font-medium text-sm flex-1"
              numberOfLines={1}
            >
              Your Location
            </Text>
          </View>

          <View className="flex-row items-center gap-3 pt-3">
            <Text className="text-brand-primary text-base">🔍</Text>
            <TextInput
              className="flex-1 text-brand-text font-medium text-sm"
              placeholder="Where to?"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 0,
                padding: 0,
                margin: 0,
              }}
            />
          </View>
        </View>
      </View>

      {/* WHITE SHEET */}
      <View className="flex-1 bg-white">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Ride / Travel toggle + heading */}
          <Animated.View
            entering={FadeInUp.delay(100).springify()}
            className="flex-row items-center justify-between px-5 pt-4 pb-3"
          >
            <Text className="text-brand-text font-bold text-base">
              Select a ride
            </Text>
            <View className="flex-row gap-2"></View>
          </Animated.View>

          {/* Fleet cards */}
          {FLEET.map((item, i) => (
            <Animated.View
              key={item.id}
              entering={FadeInUp.delay(120 + i * 50).springify()}
              className="mx-5 mb-3"
            >
              <TouchableOpacity
                onPress={() => setSelectedFleet(item)}
                activeOpacity={0.85}
                className={`border rounded-2xl p-4 ${
                  selectedFleet.id === item.id
                    ? "border-brand-primary border-2"
                    : "border-brand-border"
                }`}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="w-12 h-12 bg-brand-input rounded-xl items-center justify-center">
                    <Text className="text-2xl">{item.emoji}</Text>
                  </View>
                  <Text className="text-brand-text font-bold text-base">
                    ₹{item.price}
                  </Text>
                </View>
                <Text className="text-brand-text font-bold text-base">
                  {item.name}
                </Text>
                <Text
                  className="text-brand-sub text-xs mb-1"
                  style={{ fontStyle: "italic" }}
                >
                  {item.hindi}
                </Text>
                <Text className="text-brand-sub text-xs">{item.sub}</Text>
                <View className="flex-row items-center gap-1 mt-2">
                  <Text className="text-brand-primary text-xs">⏱</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      selectedFleet.id === item.id
                        ? "text-brand-primary"
                        : "text-brand-sub"
                    }`}
                  >
                    {item.eta} away
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {/* Promo Carousel */}
          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            className="mt-2 mb-3"
          >
            <FlatList
              ref={carouselRef}
              data={CAROUSEL}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width - 40}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / (width - 40),
                );
                setCarouselIndex(idx);
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
                      {item.tag}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: "white",
                        fontWeight: "700",
                        lineHeight: 22,
                      }}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: item.accent,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      alignSelf: "flex-start",
                      marginTop: 12,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {item.cta}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(i) => i.id}
            />
            {/* Dots */}
            <View className="flex-row justify-center gap-1.5 mt-3">
              {CAROUSEL.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: carouselIndex === i ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      carouselIndex === i ? "#1B4F8A" : "#DDE3ED",
                  }}
                />
              ))}
            </View>
          </Animated.View>

          {/* Payment row */}
          <Animated.View
            entering={FadeInUp.delay(560).springify()}
            className="mx-5 mb-3 bg-brand-input border border-brand-border rounded-2xl px-4 py-3 flex-row items-center"
          >
            <Text className="text-brand-primary text-lg mr-3">💳</Text>
            <View className="flex-1">
              <Text className="text-brand-sub text-xs">Personal ···· 4242</Text>
              <Text className="text-brand-text font-bold text-sm">Visa</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-brand-primary font-semibold text-sm">
                Change
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Promo code row */}
          <Animated.View
            entering={FadeInUp.delay(600).springify()}
            className="mx-5 mb-4 bg-brand-input border border-brand-border rounded-2xl px-4 py-3 flex-row items-center"
          >
            <Text className="text-amber-600 text-lg mr-3">🏷️</Text>
            <View className="flex-1">
              <Text className="text-brand-sub text-xs">Promotion applied</Text>
              <Text className="text-brand-text font-bold text-sm">
                FACILITY20
              </Text>
            </View>
            <View className="w-6 h-6 rounded-full bg-amber-100 items-center justify-center">
              <Text className="text-amber-600 text-xs font-bold">✓</Text>
            </View>
          </Animated.View>

          {/* Confirm button */}
          <Animated.View
            entering={FadeInUp.delay(640).springify()}
            className="mx-5"
          >
            <TouchableOpacity
              activeOpacity={0.9}
              className="bg-brand-primary rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                Confirm {selectedFleet.name} →
              </Text>
            </TouchableOpacity>
            <Text className="text-brand-sub text-xs text-center mt-2">
              By confirming, you agree to our terms of service and ride-sharing
              policies.
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}
