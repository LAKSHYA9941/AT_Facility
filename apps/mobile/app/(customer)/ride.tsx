import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRef, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  MapPin,
  Plus,
  Minus,
  Trash2,
  X,
  Navigation,
  ChevronRight,
} from "lucide-react-native";
import axios from "axios";
import { api } from "../../utils/api";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";

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
    id: "HATCHBACK",
    name: "Hatchback",
    car: "Swift / WagonR",
    tagline: "Compact & budget-friendly",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/159099/swift-exterior-right-front-three-quarter.jpeg",
    capacity: 4,
    perKm: 12,
  },
  {
    id: "SEDAN",
    name: "Sedan",
    car: "Swift Dzire / Aura",
    tagline: "Comfortable & spacious",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/159103/dzire-exterior-right-front-three-quarter.jpeg",
    capacity: 4,
    perKm: 16,
  },
  {
    id: "SUV",
    name: "Mini SUV",
    car: "Ertiga / Innova",
    tagline: "Family & group travel",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/112385/ertiga-exterior-right-front-three-quarter.jpeg",
    capacity: 7,
    perKm: 22,
  },
  {
    id: "PREMIUM",
    name: "Premium SUV",
    car: "Innova Crysta / XUV700",
    tagline: "Luxury ride experience",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/140809/innova-crysta-exterior-right-front-three-quarter.jpeg",
    capacity: 7,
    perKm: 28,
  },
  {
    id: "TEMPO",
    name: "Tempo Traveller",
    car: "12-seater Tempo",
    tagline: "Large group outings",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/46telemaster/exterior-right-front-three-quarter.jpeg",
    capacity: 12,
    perKm: 35,
  },
  {
    id: "BUS",
    name: "Mini Bus",
    car: "20-seater Bus",
    tagline: "Events & barat booking",
    image:
      "https://imgd.aeplcdn.com/370x208/n/cw/ec/46telemaster/exterior-right-front-three-quarter.jpeg",
    capacity: 20,
    perKm: 55,
  },
];

let mapplsToken: string | null = null;
let tokenExpiry: number = 0;

const getMapplsToken = async (): Promise<string> => {
  if (mapplsToken && Date.now() < tokenExpiry) return mapplsToken;
  const res = await axios.post(
    "https://outpost.mappls.com/api/security/oauth/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID!,
      client_secret: process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  mapplsToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return mapplsToken!;
};

const suggestSegment = (count: number): string => {
  if (count <= 4) return "HATCHBACK";
  if (count <= 7) return "SUV";
  if (count <= 12) return "TEMPO";
  return "BUS";
};

type LocationResult = { address: string; lat: number; lng: number };

export default function PlanTripScreen() {
  const [pickup, setPickup] = useState<LocationResult | null>(null);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [waypoints, setWaypoints] = useState<LocationResult[]>([]);
  const [travellers, setTravellers] = useState(1);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState("HATCHBACK");
  const [fareEstimate, setFareEstimate] = useState<any | null>(null);
  const [searchModal, setSearchModal] = useState<
    "pickup" | "destination" | "waypoint" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estimateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEstimating = useRef(false);

  useEffect(() => {
    const suggested = suggestSegment(travellers);
    setSelectedSegment(suggested);
  }, [travellers]);

  useEffect(() => {
    if (!pickup || !destination) return;
    if (estimateTimeout.current) clearTimeout(estimateTimeout.current);
    estimateTimeout.current = setTimeout(async () => {
      if (isEstimating.current) return;
      isEstimating.current = true;
      try {
        const { data } = await api.post("/api/trips/estimate", {
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropLat: destination.lat,
          dropLng: destination.lng,
          passengerCount: travellers,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          isRoundTrip,
          preferredSegment: selectedSegment,
        });
        setFareEstimate(data.data);
        if (
          data.data.actualSegment &&
          data.data.actualSegment !== selectedSegment
        ) {
          setSelectedSegment(data.data.actualSegment);
        }
      } catch (error) {
        console.log("Estimate failed", error);
      } finally {
        isEstimating.current = false;
      }
    }, 600);
  }, [
    pickup,
    destination,
    travellers,
    startDate,
    endDate,
    isRoundTrip,
    selectedSegment,
  ]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = await getMapplsToken();
        const res = await axios.get(
          `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(text)}&region=IND&bound=77.2,28.5,77.4,28.7`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data?.suggestedLocations) {
          setSearchResults(res.data.suggestedLocations);
        } else if (Array.isArray(res.data)) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.log("Search error", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const selectLocation = (item: any) => {
    const addr =
      item.placeName ||
      item.placeAddress ||
      item.formatted_address ||
      "Selected location";
    const lat = parseFloat(item.latitude || item.lat);
    const lng = parseFloat(item.longitude || item.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const loc = { address: addr, lat, lng };
    if (searchModal === "pickup") setPickup(loc);
    else if (searchModal === "destination") setDestination(loc);
    else if (searchModal === "waypoint") setWaypoints([...waypoints, loc]);
    setSearchModal(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const addr = geo
        ? `${geo.name || ""}, ${geo.city || geo.district || ""}`.replace(
            /^, /,
            "",
          )
        : "Current location";
      const result = {
        address: addr,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      if (searchModal === "pickup") setPickup(result);
      else if (searchModal === "destination") setDestination(result);
      setSearchModal(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (e) {
      console.log("Location error", e);
    }
  };

  const handleBook = async () => {
    if (!pickup || !destination) return;
    setBookingLoading(true);
    try {
      const { data } = await api.post("/api/trips/create", {
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropAddress: destination.address,
        dropLat: destination.lat,
        dropLng: destination.lng,
        waypoints: waypoints.map((w, i) => ({ ...w, order: i + 1 })),
        passengerCount: travellers,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isRoundTrip,
        preferredSegment: selectedSegment,
      });
      router.push({
        pathname: "/(customer)/trip-status" as any,
        params: { tripId: data.data.id },
      });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create trip");
    } finally {
      setBookingLoading(false);
    }
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const selectedVehicle =
    FLEET.find((f) => f.id === selectedSegment) || FLEET[0];
  const overCap = travellers - selectedVehicle.capacity;

  return (
    <View className="flex-1 bg-[#EEF2F7]">
      {/* Header */}
      <SafeAreaView edges={["top"]} className="bg-[#1B4F8A]">
        <View className="px-5 pt-2 pb-4">
          <Text className="text-white font-bold text-xl">Plan a Trip</Text>
          <Text className="text-white/60 text-xs mt-1">
            Book outstation rides across India
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Card */}
        <View
          className="bg-white mx-4 mt-4 rounded-2xl p-4"
          style={{ elevation: 3 }}
        >
          <TouchableOpacity
            className="flex-row items-center gap-3 pb-3"
            onPress={() => setSearchModal("pickup")}
          >
            <View className="w-3 h-3 rounded-full bg-green-500" />
            <Text
              className={`flex-1 font-medium ${pickup ? "text-[#111827]" : "text-[#9CA3AF]"}`}
              numberOfLines={1}
            >
              {pickup ? pickup.address : "Pickup location"}
            </Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#DDE3ED] ml-6 my-1" />

          <View className="flex-row items-center gap-3 pt-3 justify-between">
            <TouchableOpacity
              className="flex-row items-center gap-3 flex-1"
              onPress={() => setSearchModal("destination")}
            >
              <View className="w-3 h-3 rounded-full bg-red-500" />
              <Text
                className={`flex-1 font-medium ${destination ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                numberOfLines={1}
              >
                {destination ? destination.address : "Where to?"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-[#EEF2F7] items-center justify-center"
              onPress={() => setSearchModal("waypoint")}
            >
              <Plus size={16} color="#1B4F8A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2 - TRIP DETAILS */}
        <View className="bg-white mx-4 mt-3 rounded-2xl pt-5 px-5 pb-5">
          <View className="mb-6">
            <Text className="text-[#111827] font-semibold text-sm mb-3">
              How many travellers?
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center bg-[#EEF2F7] rounded-full px-2 py-1">
                <TouchableOpacity
                  className="w-8 h-8 items-center justify-center bg-white rounded-full"
                  onPress={() => setTravellers(Math.max(1, travellers - 1))}
                >
                  <Minus size={16} color="#111827" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-bold text-[#111827] text-lg">
                  {travellers}
                </Text>
                <TouchableOpacity
                  className="w-8 h-8 items-center justify-center bg-white rounded-full shadow-sm"
                  onPress={() => setTravellers(Math.min(20, travellers + 1))}
                >
                  <Plus size={16} color="#111827" />
                </TouchableOpacity>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-[#1B4F8A] font-medium text-xs">
                  Suggested: {selectedVehicle.name} ({selectedVehicle.capacity}{" "}
                  seats)
                </Text>
                {overCap > 0 && overCap <= 2 && (
                  <Text className="text-amber-600 text-[10px] mt-1">
                    + ₹200/head for up to 2 extra | or split into 2 vehicles
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[#111827] font-semibold text-sm mb-3">
              Trip dates
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TouchableOpacity
                  className="border border-[#DDE3ED] rounded-xl py-3 px-3 flex-row justify-between items-center"
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text className="text-[#9CA3AF] text-xs">Start date</Text>
                  <Text className="text-[#111827] font-medium text-sm">
                    {startDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>
              <View className="flex-1">
                <TouchableOpacity
                  className="border border-[#DDE3ED] rounded-xl py-3 px-3 flex-row justify-between items-center"
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text className="text-[#9CA3AF] text-xs">End date</Text>
                  <Text className="text-[#111827] font-medium text-sm">
                    {endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    minimumDate={startDate}
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </View>
            </View>
            {isSameDay ? (
              <Text className="text-[#1B4F8A] bg-blue-50 self-start px-2 py-1 rounded text-xs mt-2 font-medium">
                Day trip
              </Text>
            ) : (
              <Text className="text-[#9CA3AF] text-xs mt-2">
                {Math.ceil(
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 3600 * 24),
                ) + 1}{" "}
                days · Driver allowance ₹500/day
              </Text>
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row bg-[#EEF2F7] rounded-xl p-1">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${!isRoundTrip ? "bg-white shadow-sm" : ""}`}
                onPress={() => setIsRoundTrip(false)}
              >
                <Text
                  className={`font-semibold text-sm ${!isRoundTrip ? "text-[#1B4F8A]" : "text-[#9CA3AF]"}`}
                >
                  One Way
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${isRoundTrip ? "bg-white shadow-sm" : ""}`}
                onPress={() => setIsRoundTrip(true)}
              >
                <Text
                  className={`font-semibold text-sm ${isRoundTrip ? "text-[#1B4F8A]" : "text-[#9CA3AF]"}`}
                >
                  Round Trip
                </Text>
              </TouchableOpacity>
            </View>
            {isRoundTrip && (
              <Text className="text-green-600 text-xs font-medium mt-2 text-center">
                12% discount applied 🎉
              </Text>
            )}
          </View>

          {waypoints.length > 0 && (
            <View className="mb-4">
              <Text className="text-[#111827] font-semibold text-sm mb-2">
                Waypoints
              </Text>
              {waypoints.map((wp, i) => (
                <View
                  key={i}
                  className="flex-row items-center gap-2 mb-2 bg-[#EEF2F7] px-3 py-2 rounded-xl"
                >
                  <MapPin size={14} color="#1B4F8A" />
                  <Text
                    className="flex-1 text-xs text-[#111827]"
                    numberOfLines={1}
                  >
                    {wp.address}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setWaypoints(waypoints.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => setSearchModal("waypoint")}>
                <Text className="text-[#1B4F8A] text-xs font-semibold">
                  + Add stop
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SECTION 3 - VEHICLE OPTIONS */}
        <View className="bg-white mx-4 mt-3 rounded-2xl pt-5 pb-5">
          <Text className="px-5 text-[#111827] font-bold text-lg mb-4">
            Choose your vehicle
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {FLEET.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => setSelectedSegment(item.id)}
                className={`w-44 rounded-2xl border-2 bg-white overflow-hidden ${selectedSegment === item.id ? "border-[#1B4F8A]" : "border-[#DDE3ED]"}`}
                style={
                  selectedSegment === item.id ? styles.selectedCard : undefined
                }
              >
                <Image
                  source={{ uri: item.image }}
                  style={{ width: "100%", height: 90 }}
                  resizeMode="cover"
                />
                <View className="p-3">
                  <Text className="font-bold text-[#111827] text-sm">
                    {item.name}
                  </Text>
                  <Text className="text-[#1B4F8A] text-xs font-medium">
                    {item.car}
                  </Text>
                  <Text className="text-[#9CA3AF] text-[10px] mt-1">
                    {item.tagline}
                  </Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <View className="bg-[#EEF2F7] px-2 py-0.5 rounded">
                      <Text className="text-[#111827] text-xs font-medium">
                        {item.capacity} seats
                      </Text>
                    </View>
                    <Text className="font-bold text-[#111827] text-sm">
                      ₹{item.perKm}/km
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="px-5 mt-4">
            {overCap > 2 ? (
              <View className="bg-red-50 p-3 rounded-xl border border-red-100">
                <Text className="text-red-700 text-xs font-medium">
                  ⚠️ Too many travellers. Please select a larger vehicle.
                </Text>
              </View>
            ) : overCap > 0 ? (
              <View className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <Text className="text-amber-700 text-xs font-medium">
                  + ₹{overCap * 200} for {overCap} extra travellers
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* SECTION 4 - FARE ESTIMATE */}
        {fareEstimate && (
          <Animated.View
            entering={FadeInUp}
            className="bg-white mt-2 px-5 py-6"
          >
            <View className="border border-[#DDE3ED] rounded-2xl p-4">
              <Text className="font-bold text-[#111827] mb-4">
                Fare Estimate
              </Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-[#9CA3AF] text-sm">
                  Base fare (₹{fareEstimate.baseFare} ×{" "}
                  {fareEstimate.distanceKm.toFixed(1)} km)
                </Text>
                <Text className="text-[#111827] font-medium">
                  ₹{Math.round(fareEstimate.baseFare * fareEstimate.distanceKm)}
                </Text>
              </View>

              {fareEstimate.totalDays > 1 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#9CA3AF] text-sm">
                    Driver allowance ({fareEstimate.totalDays - 1} days)
                  </Text>
                  <Text className="text-[#111827] font-medium">
                    ₹{fareEstimate.driverAllowance}
                  </Text>
                </View>
              )}

              {fareEstimate.roundTripDiscount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-green-600 text-sm font-medium">
                    Round trip discount (12%)
                  </Text>
                  <Text className="text-green-600 font-medium">
                    - ₹{fareEstimate.roundTripDiscount}
                  </Text>
                </View>
              )}

              {fareEstimate.extraHeadFare > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#9CA3AF] text-sm">
                    Extra travellers ({fareEstimate.extraPassengers} × ₹200)
                  </Text>
                  <Text className="text-[#111827] font-medium">
                    ₹{fareEstimate.extraHeadFare}
                  </Text>
                </View>
              )}

              <View className="h-[1px] bg-[#DDE3ED] my-3" />

              <View className="flex-row justify-between items-center">
                <Text className="text-[#111827] font-bold text-lg">Total</Text>
                <Text className="text-[#1B4F8A] font-bold text-xl">
                  ₹{fareEstimate.totalFare}
                </Text>
              </View>
              <Text className="text-[#9CA3AF] text-[10px] text-right mt-1">
                Upfront payment · No surge pricing
              </Text>
            </View>
          </Animated.View>
        )}

        {/* SECTION 6 - BOOK BUTTON */}
        <View className="bg-white mt-2 px-5 py-6">
          <TouchableOpacity
            disabled={!pickup || !destination || bookingLoading || overCap > 2}
            onPress={handleBook}
            className={`w-full py-4 rounded-2xl items-center flex-row justify-center ${!pickup || !destination || bookingLoading || overCap > 2 ? "bg-[#9CA3AF]" : "bg-[#1B4F8A]"}`}
          >
            {bookingLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Book Trip {fareEstimate ? `· ₹${fareEstimate.totalFare}` : ""}
              </Text>
            )}
          </TouchableOpacity>
          <Text className="text-[#9CA3AF] text-xs text-center mt-3">
            Secure upfront payment via Razorpay · Free cancellation within 10
            mins
          </Text>
        </View>
      </ScrollView>

      {/* SEARCH MODAL */}
      <Modal
        visible={!!searchModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center p-4 border-b border-[#DDE3ED]">
            <TouchableOpacity
              onPress={() => setSearchModal(null)}
              className="mr-3"
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <TextInput
              autoFocus
              className="flex-1 bg-[#EEF2F7] px-4 py-2 rounded-xl text-[#111827] font-medium"
              placeholder={
                searchModal === "pickup"
                  ? "Enter pickup location"
                  : searchModal === "destination"
                    ? "Enter destination"
                    : "Add a stop"
              }
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          {searchLoading && (
            <ActivityIndicator className="mt-4" color="#1B4F8A" />
          )}
          <FlatList
            data={searchResults}
            keyExtractor={(i, idx) => idx.toString()}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={() => (
              <TouchableOpacity
                className="p-4 border-b border-[#EEF2F7] flex-row items-center"
                onPress={useCurrentLocation}
              >
                <Navigation size={18} color="#1B4F8A" />
                <Text className="text-[#1B4F8A] font-bold ml-3">
                  Use current location
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() =>
              !searchLoading && searchQuery.length > 0 ? (
                <Text className="text-[#9CA3AF] text-center mt-8">
                  No results found
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-4 border-b border-[#EEF2F7]"
                onPress={() => selectLocation(item)}
              >
                <Text className="text-[#111827] font-bold text-sm mb-1">
                  {item.placeName ||
                    item.poi ||
                    item.placeAddress?.split(",")[0]}
                </Text>
                <Text className="text-[#9CA3AF] text-xs" numberOfLines={2}>
                  {item.placeAddress || item.formatted_address}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Cleaned style reference to safeguard NativeWind's stringify engine
const styles = StyleSheet.create({
  selectedCard: {
    transform: [{ scale: 1.02 }],
    shadowColor: "#1B4F8A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
});
