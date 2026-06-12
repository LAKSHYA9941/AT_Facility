import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../utils/api";
import { useMockStore, MOCK_DRIVER } from "../../store/mock";

export default function TripConfirmedScreen() {
  const { tripId } = useLocalSearchParams();
  const { isMockMode, updateActiveMockTrip } = useMockStore();
  const isMockTrip =
    typeof tripId === "string" && tripId.startsWith("mock-trip-");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bounce animation on the checkmark ──
  const scale = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
  }, []);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ── Pulsing dots ──
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withSpring(1, { damping: 2 }), -1, true);
    setTimeout(() => {
      dot2.value = withRepeat(withSpring(1, { damping: 2 }), -1, true);
    }, 200);
    setTimeout(() => {
      dot3.value = withRepeat(withSpring(1, { damping: 2 }), -1, true);
    }, 400);
  }, []);

  const dotStyle = (dotVal: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ translateY: dotVal.value * -5 }],
      opacity: 0.5 + dotVal.value * 0.5,
    }));

  const [refreshing, setRefreshing] = useState(false);

  const checkTripStatus = async () => {
    if (isMockMode || isMockTrip) return;
    try {
      const res = await api.get(`/api/trips/${tripId}`);
      const trip = res.data.data;
      if (
        trip &&
        ["DRIVER_ASSIGNED", "DRIVER_ENROUTE", "ACTIVE"].includes(trip.status)
      ) {
        if (trip.status === "DRIVER_ASSIGNED" && trip.driver) {
          Alert.alert(
            "Driver Assigned",
            `${trip.driver.user?.name || trip.driver.name} will pick you up in your ${trip.driver.vehicle?.model || trip.driver.vehicleModel || "vehicle"}.\nPlate: ${trip.driver.vehicle?.plateNumber || trip.driver.plateNumber || "N/A"}`,
            [
              {
                text: "View Details",
                onPress: () =>
                  router.replace({
                    pathname: "/(customer)/active-trip",
                    params: { tripId },
                  }),
              },
            ],
          );
        } else {
          router.replace({
            pathname: "/(customer)/active-trip",
            params: { tripId },
          });
        }
      }
    } catch (e) {
      console.log("Error checking trip status", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkTripStatus();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isMockMode || isMockTrip) {
      timerRef.current = setTimeout(() => {
        updateActiveMockTrip({
          status: "DRIVER_ASSIGNED",
          driver: MOCK_DRIVER,
        });

        Alert.alert(
          "Driver Assigned",
          `${MOCK_DRIVER.name} will pick you up in your ${MOCK_DRIVER.vehicleModel}.\nPlate: ${MOCK_DRIVER.plateNumber}`,
          [
            {
              text: "View Trip Details",
              onPress: () =>
                router.replace({
                  pathname: "/(customer)/active-trip",
                  params: { tripId },
                }),
            },
          ],
        );
      }, 3000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // REAL MODE: polling
    const interval = setInterval(() => {
      checkTripStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [tripId, isMockMode, isMockTrip]);

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2F7]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="items-center mt-12 px-5">
          <Animated.View style={checkStyle}>
            <CheckCircle2 size={80} color="#22c55e" />
          </Animated.View>
          <Text className="text-[#111827] font-bold text-2xl mt-4">
            Trip Booked!
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          className="bg-white mx-4 mt-8 rounded-3xl p-6 shadow-sm border border-[#DDE3ED]"
        >
          <View className="flex-row items-center justify-center gap-2 mb-4">
            <Text className="text-[#1B4F8A] font-semibold text-lg text-center">
              Finding your driver
            </Text>
            <View className="flex-row items-end pb-1 gap-1">
              <Animated.View
                className="w-1.5 h-1.5 bg-[#1B4F8A] rounded-full"
                style={dotStyle(dot1)}
              />
              <Animated.View
                className="w-1.5 h-1.5 bg-[#1B4F8A] rounded-full"
                style={dotStyle(dot2)}
              />
              <Animated.View
                className="w-1.5 h-1.5 bg-[#1B4F8A] rounded-full"
                style={dotStyle(dot3)}
              />
            </View>
          </View>

          <Text className="text-[#9CA3AF] text-center text-sm mb-6 leading-relaxed">
            {isMockMode || isMockTrip
              ? "Mock driver will be assigned in 3 seconds..."
              : "Drivers are being notified. You'll receive a notification once a driver accepts your trip."}
          </Text>

          <View className="gap-3">
            <TouchableOpacity
              className="w-full bg-[#1B4F8A] py-4 rounded-xl items-center"
              onPress={() =>
                router.replace({
                  pathname: "/(customer)/active-trip",
                  params: { tripId },
                })
              }
            >
              <Text className="text-white font-bold text-base">
                View Trip Status
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full bg-[#EEF2F7] py-4 rounded-xl items-center"
              onPress={() => router.replace("/(customer)/plan-trip")}
            >
              <Text className="text-[#1B4F8A] font-bold text-base">
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
