import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Linking,
  Alert,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  SlideInUp,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Phone,
  Navigation,
  X,
  Clock,
  MapPin,
  CircleDot,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "../utils/api";

// ─── DIMENSIONS ──────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── BOTTOM SHEET SNAP POINTS ────────────────────────────────────
const SHEET_COLLAPSED = 260;
const SHEET_EXPANDED = SCREEN_H * 0.55;
const SLIDER_TRACK_WIDTH = SCREEN_W - 80;
const SLIDER_THUMB = 58;

// ─── MAP STYLE ──────────────────────────────────────────────────
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#e8edf5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1B4F8A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#dde3ed" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8d8e4" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// ─── TYPES ──────────────────────────────────────────────────────
type Waypoint = {
  address: string;
  lat: number;
  lng: number;
  orderIndex: number;
};

type TripData = {
  id: string;
  status: string;
  totalFare: number;
  balanceRemaining: number;
  passengerCount: number;
  tripType: string;
  startDate: string;
  waypoints: Waypoint[];
  user?: { name?: string; phone?: string };
};

type Props = {
  trip: TripData;
  onTripCompleted: () => void;
  onTripCancelled: () => void;
};

// ─── COMPONENT ──────────────────────────────────────────────────
export default function ActiveTripScreen({
  trip,
  onTripCompleted,
  onTripCancelled,
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // ── Bottom Sheet Animation ─────────────────────────────────
  const sheetTranslateY = useSharedValue(0);
  const sheetContext = useSharedValue(0);
  const maxDrag = -(SHEET_EXPANDED - SHEET_COLLAPSED);

  const sheetGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          sheetContext.value = sheetTranslateY.value;
        })
        .onUpdate((e) => {
          const next = sheetContext.value + e.translationY;
          sheetTranslateY.value = Math.max(maxDrag, Math.min(0, next));
        })
        .onEnd((e) => {
          const threshold = maxDrag * 0.3;
          if (sheetTranslateY.value < threshold || e.velocityY < -500) {
            sheetTranslateY.value = withSpring(maxDrag, {
              damping: 20,
              stiffness: 180,
            });
          } else {
            sheetTranslateY.value = withSpring(0, {
              damping: 20,
              stiffness: 180,
            });
          }
        }),
    [maxDrag],
  );

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetTranslateY.value,
      [maxDrag, 0],
      [0.4, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Slide-to-Complete Animation ────────────────────────────
  const slideX = useSharedValue(0);
  const slideCtx = useSharedValue(0);
  const [completing, setCompleting] = useState(false);
  const maxSlide = SLIDER_TRACK_WIDTH - SLIDER_THUMB;

  const triggerComplete = useCallback(async () => {
    setCompleting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.post(`/api/trips/${trip.id}/complete`);
      Alert.alert("Trip Complete", "Trip completed successfully! Drive safe.");
      onTripCompleted();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to complete trip",
      );
      slideX.value = withSpring(0, { damping: 15 });
    } finally {
      setCompleting(false);
    }
  }, [trip.id]);

  const slideGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          slideCtx.value = slideX.value;
        })
        .onUpdate((e) => {
          const next = slideCtx.value + e.translationX;
          slideX.value = Math.max(0, Math.min(maxSlide, next));
        })
        .onEnd(() => {
          if (slideX.value > maxSlide * 0.85) {
            slideX.value = withSpring(maxSlide, { damping: 15 });
            runOnJS(triggerComplete)();
          } else {
            slideX.value = withSpring(0, { damping: 15 });
          }
        }),
    [maxSlide, triggerComplete],
  );

  const slideThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const slideTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      slideX.value,
      [0, maxSlide * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const slideCheckStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      slideX.value,
      [maxSlide * 0.6, maxSlide],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Cancel Handler ─────────────────────────────────────────
  const handleCancelTrip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip? This action cannot be undone.",
      [
        { text: "No, Continue", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/api/trips/${trip.id}/driver-cancel`, {
                reason: "Driver cancelled during active trip",
              });
              Alert.alert("Cancelled", "Trip has been cancelled.");
              onTripCancelled();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to cancel",
              );
            }
          },
        },
      ],
    );
  }, [trip.id]);

  // ── Fit map to waypoints ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !trip.waypoints?.length) return;

    if (trip.waypoints.length > 1) {
      const coords = trip.waypoints.map((w) => ({
        latitude: w.lat,
        longitude: w.lng,
      }));
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: {
            top: 140,
            right: 60,
            bottom: SHEET_COLLAPSED + 40,
            left: 60,
          },
          animated: true,
        });
      }, 500);
    } else if (trip.waypoints.length === 1) {
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: trip.waypoints[0].lat,
            longitude: trip.waypoints[0].lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000,
        );
      }, 500);
    }
  }, [trip.waypoints]);

  // ── Derived data ───────────────────────────────────────────
  const pickup = trip.waypoints?.[0];
  const drop = trip.waypoints?.[trip.waypoints.length - 1];
  const passengerName = trip.user?.name || "Passenger";
  const passengerInitials = passengerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ── Elapsed time ───────────────────────────────────────────
  const [elapsed, setElapsed] = useState("0:00");
  useEffect(() => {
    const start = new Date(trip.startDate).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Date.now() - start);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [trip.startDate]);

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ═══ MAP LAYER ═══════════════════════════════════════════ */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
      >
        {pickup && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title="Pickup"
            description={pickup.address}
          >
            <View
              className="w-7 h-7 rounded-full bg-white items-center justify-center"
              style={{
                borderWidth: 3,
                borderColor: "#1B4F8A",
                ...Platform.select({
                  ios: {
                    shadowColor: "#1B4F8A",
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  },
                  android: { elevation: 4 },
                }),
              }}
            >
              <View className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
            </View>
          </Marker>
        )}
        {drop && (
          <Marker
            coordinate={{ latitude: drop.lat, longitude: drop.lng }}
            title="Drop-off"
            description={drop.address}
          >
            <View className="items-center justify-center">
              <MapPin size={28} color="#1B4F8A" fill="#1B4F8A" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ═══ TOP NAV BANNER ══════════════════════════════════════ */}
      <Animated.View
        entering={SlideInUp.duration(400)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 4,
        }}
        pointerEvents="box-none"
      >
        <View
          className="bg-white/95 rounded-2xl p-3.5"
          style={Platform.select({
            ios: {
              shadowColor: "rgba(27,79,138,0.12)",
              shadowOpacity: 1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
            },
            android: { elevation: 8 },
          })}
        >
          {/* Navigation indicator */}
          <View className="flex-row items-center gap-3">
            <View className="w-[42px] h-[42px] rounded-[14px] bg-brand-primary items-center justify-center">
              <Navigation size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-brand-sub text-[9px] font-bold tracking-wider">
                {trip.tripType === "ROUND_TRIP" &&
                (!trip.waypoints || trip.waypoints.length === 1)
                  ? "DESTINATION TBD"
                  : "NAVIGATING TO DROP-OFF"}
              </Text>
              <Text
                className="text-brand-text text-sm font-bold mt-0.5"
                numberOfLines={1}
              >
                {trip.tripType === "ROUND_TRIP" &&
                (!trip.waypoints || trip.waypoints.length === 1)
                  ? "Customer will confirm live"
                  : drop?.address || "Destination"}
              </Text>
            </View>
            <View className="bg-brand-bg rounded-xl px-3 py-2 items-center">
              <Text className="text-brand-sub text-[8px] font-bold tracking-wider">
                TRIP TIME
              </Text>
              <Text className="text-brand-primary text-base font-extrabold mt-0.5">
                {elapsed}
              </Text>
            </View>
          </View>

          {/* Quick actions bar */}
          <View className="flex-row gap-2 mt-2.5">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-brand-bg rounded-xl py-2.5"
              onPress={() => {
                if (trip.user?.phone) Linking.openURL(`tel:${trip.user.phone}`);
              }}
            >
              <Phone size={14} color="#1B4F8A" />
              <Text className="text-brand-primary text-xs font-bold">Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-red-50 rounded-xl py-2.5"
              onPress={handleCancelTrip}
            >
              <X size={14} color="#ef4444" />
              <Text className="text-red-500 text-xs font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ═══ BOTTOM SHEET ════════════════════════════════════════ */}
      <GestureDetector gesture={sheetGesture}>
        <Animated.View
          className="absolute left-0 right-0 bg-white rounded-t-[28px] px-5"
          style={[
            {
              height: SHEET_EXPANDED,
              bottom: -(SHEET_EXPANDED - SHEET_COLLAPSED),
              paddingBottom: insets.bottom,
              zIndex: 20,
              ...Platform.select({
                ios: {
                  shadowColor: "rgba(0,0,0,0.15)",
                  shadowOpacity: 1,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: -6 },
                },
                android: { elevation: 12 },
              }),
            },
            sheetAnimStyle,
          ]}
        >
          {/* Drag handle */}
          <View className="items-center pt-2.5 pb-1.5">
            <Animated.View
              className="w-10 h-1 rounded-full bg-brand-border"
              style={handleOpacity}
            />
          </View>

          {/* ── Passenger Card ──────────────────────────────── */}
          <View className="flex-row items-center gap-3 py-3 border-b border-brand-bg">
            <View className="w-[46px] h-[46px] rounded-full bg-brand-primary items-center justify-center">
              <Text className="text-white font-extrabold text-base">
                {passengerInitials}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-brand-text text-base font-bold">
                {passengerName}
              </Text>
              <Text className="text-brand-sub text-xs mt-0.5">
                {trip.passengerCount} passenger
                {trip.passengerCount > 1 ? "s" : ""} ·{" "}
                {trip.tripType.replace("_", " ")}
              </Text>
            </View>
            {trip.user?.phone && (
              <TouchableOpacity
                className="w-[42px] h-[42px] rounded-full bg-brand-bg items-center justify-center"
                onPress={() => Linking.openURL(`tel:${trip.user!.phone}`)}
              >
                <Phone size={18} color="#1B4F8A" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Route Addresses ─────────────────────────────── */}
          <View className="flex-row gap-3 py-3.5 border-b border-brand-bg">
            {/* Dots and line */}
            <View className="items-center w-3.5 pt-1">
              <View className="w-2.5 h-2.5 rounded-full border-2 border-brand-primary bg-white" />
              <View className="flex-1 w-0.5 bg-brand-border my-1" />
              <View className="w-2.5 h-2.5 rounded-sm bg-brand-primary" />
            </View>
            {/* Text */}
            <View className="flex-1 justify-between">
              <View>
                <Text className="text-brand-sub text-[9px] font-bold tracking-wider">
                  PICKUP
                </Text>
                <Text
                  className="text-brand-text text-[13px] font-semibold mt-0.5"
                  numberOfLines={1}
                >
                  {pickup?.address || "Pickup location"}
                </Text>
              </View>
              <View className="h-3" />
              <View>
                <Text className="text-brand-sub text-[9px] font-bold tracking-wider">
                  {trip.tripType === "ROUND_TRIP" &&
                  (!trip.waypoints || trip.waypoints.length === 1)
                    ? "DESTINATION"
                    : "DROP-OFF"}
                </Text>
                <Text
                  className="text-brand-text text-[13px] font-semibold mt-0.5"
                  numberOfLines={1}
                >
                  {trip.tripType === "ROUND_TRIP" &&
                  (!trip.waypoints || trip.waypoints.length === 1)
                    ? "Customer will confirm live"
                    : drop?.address || "Drop-off location"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Fare Chips ──────────────────────────────────── */}
          <View className="flex-row gap-2.5 py-3.5">
            <View className="flex-1 bg-brand-bg rounded-[14px] py-3 items-center">
              <Text className="text-brand-sub text-[9px] font-bold tracking-wider">
                TOTAL FARE
              </Text>
              <Text className="text-brand-primary text-lg font-extrabold mt-0.5">
                ₹{trip.totalFare}
              </Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-[14px] py-3 items-center border border-green-100">
              <Text className="text-green-700 text-[9px] font-bold tracking-wider">
                COLLECT CASH
              </Text>
              <Text className="text-green-800 text-lg font-extrabold mt-0.5">
                ₹{trip.balanceRemaining ?? 0}
              </Text>
            </View>
          </View>

          {/* ── Slide to Complete ────────────────────────────── */}
          <View
            className="rounded-full overflow-hidden justify-center"
            style={{
              height: 62,
              backgroundColor: "#16a34a",
              marginBottom: Math.max(insets.bottom, 8),
            }}
          >
            <Animated.Text
              className="absolute w-full text-center text-white/85 text-[15px] font-bold"
              style={slideTextStyle}
            >
              Slide to Complete Trip →
            </Animated.Text>
            <Animated.Text
              className="absolute w-full text-center text-white text-[15px] font-extrabold"
              style={slideCheckStyle}
            >
              Release to Confirm
            </Animated.Text>
            <GestureDetector gesture={slideGesture}>
              <Animated.View
                className="absolute bg-white items-center justify-center"
                style={[
                  {
                    left: 3,
                    top: 2,
                    width: SLIDER_THUMB,
                    height: SLIDER_THUMB,
                    borderRadius: SLIDER_THUMB / 2,
                    ...Platform.select({
                      ios: {
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                      },
                      android: { elevation: 4 },
                    }),
                  },
                  slideThumbStyle,
                ]}
              >
                {completing ? (
                  <Clock size={22} color="#16a34a" />
                ) : (
                  <ChevronRight size={24} color="#16a34a" strokeWidth={3} />
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
