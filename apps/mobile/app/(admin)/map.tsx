import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
  Linking,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { api } from "../../utils/api";
import { connectSocket, getSocket, EVENTS } from "../../utils/socket";
import { SkeletonCard } from "../../components/SkeletonLoader";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Types ──────────────────────────────────────────────

type ActiveDriver = {
  driverId: string;
  userId: string;
  name: string | null;
  phone: string;
  lat: number | null;
  lng: number | null;
  lastLocationAt: string | null;
  segment: string | null;
  isAvailable: boolean;
  vehicle: {
    make: string;
    model: string;
    plateNumber: string;
    color: string;
  } | null;
};

// ── Segment colors ──────────────────────────────────────

const SEGMENT_COLORS: Record<
  string,
  { bg: string; text: string; emoji: string }
> = {
  HATCHBACK: { bg: "#EAF3DE", text: "#3B6D11", emoji: "🚗" },
  SEDAN: { bg: "#E8EFF9", text: "#1B4F8A", emoji: "🚙" },
  MINI_SUV: { bg: "#FAEEDA", text: "#854F0B", emoji: "🚐" },
  SUV: { bg: "#F3E8FF", text: "#7C3AED", emoji: "🚘" },
  TEMPO: { bg: "#FCEBEB", text: "#A32D2D", emoji: "🚚" },
};

const DEFAULT_SEGMENT = { bg: "#EEF2F7", text: "#9CA3AF", emoji: "📍" };

export default function MapScreen() {
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<ActiveDriver | null>(
    null,
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const socketSetup = useRef(false);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch active drivers ──────────────────────────

  const fetchDrivers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get("/api/admin/drivers/active-locations");
      setDrivers(res.data.data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Fetch drivers error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket listener for real-time updates ──────────

  useEffect(() => {
    fetchDrivers();

    // Auto-refresh every 15 seconds
    refreshInterval.current = setInterval(() => {
      fetchDrivers(false);
    }, 15000);

    // Setup socket for live location updates
    const setupSocket = async () => {
      if (socketSetup.current) return;
      try {
        const socket = await connectSocket();
        socket.on(
          EVENTS.ADMIN_DRIVER_LOCATION,
          (data: {
            driverId: string;
            lat: number;
            lng: number;
            heading?: number;
          }) => {
            setDrivers((prev) =>
              prev.map((d) =>
                d.driverId === data.driverId
                  ? { ...d, lat: data.lat, lng: data.lng }
                  : d,
              ),
            );
            setLastUpdated(new Date());
          },
        );
        socketSetup.current = true;
      } catch {
        // Socket connection failed — fallback to polling only
      }
    };

    setupSocket();

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      const socket = getSocket();
      if (socket) {
        socket.off(EVENTS.ADMIN_DRIVER_LOCATION);
      }
      socketSetup.current = false;
    };
  }, [fetchDrivers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDrivers(false);
    setRefreshing(false);
  }, [fetchDrivers]);

  // ── Segment summary ──────────────────────────────

  const segmentCounts = drivers.reduce(
    (acc, d) => {
      const seg = d.segment || "UNKNOWN";
      acc[seg] = (acc[seg] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const availableCount = drivers.filter((d) => d.isAvailable).length;

  // ── Helpers ──────────────────────────────────

  const getSegmentStyle = (segment: string | null) =>
    SEGMENT_COLORS[segment || ""] || DEFAULT_SEGMENT;

  const getInitials = (name: string | null) =>
    (name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const callDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-brand-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-brand-text font-bold text-xl">
              Live Drivers
            </Text>
            <Text className="text-brand-sub text-sm mt-0.5">
              {drivers.length} online · {availableCount} available
            </Text>
          </View>
          <View className="items-end">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: drivers.length > 0 ? "#16a34a" : "#9CA3AF",
                marginBottom: 4,
              }}
            />
            <Text style={{ color: "#9CA3AF", fontSize: 9 }}>
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Segment summary pills */}
        {Object.keys(segmentCounts).length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 10 }}
          >
            {Object.entries(segmentCounts).map(([seg, count]) => {
              const style = getSegmentStyle(seg);
              return (
                <View
                  key={seg}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: style.bg,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{style.emoji}</Text>
                  <Text
                    style={{
                      color: style.text,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {seg.replace("_", " ")} ({count})
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Map placeholder + driver list */}
      {loading ? (
        <View style={{ flex: 1 }}>
          {/* Skeleton map area */}
          <View
            style={{
              height: 240,
              backgroundColor: "#EEF2F7",
              margin: 20,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🗺️</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
              Loading driver locations...
            </Text>
          </View>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : drivers.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🚗💤</Text>
          <Text className="text-brand-text font-bold text-lg">
            No drivers online
          </Text>
          <Text className="text-brand-sub text-sm mt-1">
            Active drivers will appear here in real-time
          </Text>
          <TouchableOpacity
            onPress={() => fetchDrivers()}
            activeOpacity={0.8}
            style={{
              marginTop: 20,
              backgroundColor: "#1B4F8A",
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1B4F8A"
            />
          }
        >
          {/* Location overview card */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={{
              margin: 20,
              backgroundColor: "#F0F4F8",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "#DDE3ED",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: "#111827", fontWeight: "700", fontSize: 15 }}
              >
                📍 Driver Locations
              </Text>
              <Text
                style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 13 }}
              >
                {drivers.length} active
              </Text>
            </View>

            {/* Mini location grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {drivers.slice(0, 8).map((driver) => {
                const seg = getSegmentStyle(driver.segment);
                return (
                  <TouchableOpacity
                    key={driver.driverId}
                    onPress={() => setSelectedDriver(driver)}
                    activeOpacity={0.7}
                    style={{
                      width: (SCREEN_W - 80) / 4,
                      alignItems: "center",
                      padding: 8,
                      borderRadius: 12,
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: driver.isAvailable ? "#C0DD97" : "#DDE3ED",
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>
                      {seg.emoji}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: "#111827",
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {driver.name?.split(" ")[0] || "Driver"}
                    </Text>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: driver.isAvailable
                          ? "#16a34a"
                          : "#FBBF24",
                        marginTop: 4,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
              {drivers.length > 8 && (
                <View
                  style={{
                    width: (SCREEN_W - 80) / 4,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: "#EEF2F7",
                  }}
                >
                  <Text
                    style={{
                      color: "#1B4F8A",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    +{drivers.length - 8}
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 9 }}>more</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Driver list */}
          <Text className="text-brand-sub font-semibold text-xs px-5 pb-2 uppercase tracking-widest">
            All active drivers
          </Text>

          {drivers.map((driver, i) => {
            const seg = getSegmentStyle(driver.segment);
            return (
              <Animated.View
                key={driver.driverId}
                entering={FadeInDown.delay(i * 40).springify()}
              >
                <TouchableOpacity
                  onPress={() => setSelectedDriver(driver)}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
                >
                  <View className="relative">
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: seg.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{seg.emoji}</Text>
                    </View>
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: driver.isAvailable
                          ? "#16a34a"
                          : "#FBBF24",
                        borderWidth: 2,
                        borderColor: "white",
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-brand-text font-bold text-sm">
                      {driver.name || "Unknown Driver"}
                    </Text>
                    <Text className="text-brand-sub text-xs mt-0.5">
                      {driver.vehicle
                        ? `${driver.vehicle.make} ${driver.vehicle.model} · ${driver.vehicle.plateNumber}`
                        : "No vehicle info"}
                    </Text>
                    {driver.lat && driver.lng && (
                      <Text
                        style={{ color: "#9CA3AF", fontSize: 10, marginTop: 2 }}
                      >
                        📍 {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                      </Text>
                    )}
                  </View>
                  <View className="items-end gap-1">
                    <View
                      style={{
                        backgroundColor: seg.bg,
                        borderRadius: 20,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: seg.text,
                          fontSize: 9,
                          fontWeight: "700",
                        }}
                      >
                        {(driver.segment || "").replace("_", " ")}
                      </Text>
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 9 }}>
                      {driver.isAvailable ? "Available" : "On trip"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Driver Detail Modal ─────────────────────── */}
      <Modal
        visible={!!selectedDriver}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDriver(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setSelectedDriver(null)}
        />
        {selectedDriver && (
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#DDE3ED",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            {/* Driver avatar + name */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: getSegmentStyle(selectedDriver.segment).bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 28 }}>
                  {getSegmentStyle(selectedDriver.segment).emoji}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#111827", fontWeight: "700", fontSize: 17 }}
                >
                  {selectedDriver.name || "Unknown Driver"}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                  {selectedDriver.phone}
                </Text>
              </View>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: selectedDriver.isAvailable
                    ? "#16a34a"
                    : "#FBBF24",
                }}
              />
            </View>

            {/* Info */}
            <View
              style={{
                backgroundColor: "#EEF2F7",
                borderRadius: 16,
                padding: 14,
                gap: 10,
                marginBottom: 16,
              }}
            >
              <DetailRow
                label="Vehicle"
                value={
                  selectedDriver.vehicle
                    ? `${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model}`
                    : "—"
                }
              />
              <DetailRow
                label="Plate"
                value={selectedDriver.vehicle?.plateNumber || "—"}
              />
              <DetailRow
                label="Color"
                value={selectedDriver.vehicle?.color || "—"}
              />
              <DetailRow
                label="Segment"
                value={(selectedDriver.segment || "—").replace("_", " ")}
              />
              <DetailRow
                label="Status"
                value={selectedDriver.isAvailable ? "Available" : "On trip"}
                valueColor={selectedDriver.isAvailable ? "#16a34a" : "#854F0B"}
              />
              {selectedDriver.lat && selectedDriver.lng && (
                <DetailRow
                  label="Location"
                  value={`${selectedDriver.lat.toFixed(5)}, ${selectedDriver.lng.toFixed(5)}`}
                />
              )}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => callDriver(selectedDriver.phone)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: "#EAF3DE",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#3B6D11", fontWeight: "700", fontSize: 15 }}
                >
                  📞 Call Driver
                </Text>
              </TouchableOpacity>
              {selectedDriver.lat && selectedDriver.lng && (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://maps.google.com/?q=${selectedDriver.lat},${selectedDriver.lng}`,
                    )
                  }
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    backgroundColor: "#E8EFF9",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#1B4F8A",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    🗺️ Open Map
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper ──────────────────────────────────

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: valueColor || "#111827",
          fontWeight: "600",
          fontSize: 12,
          textTransform: "capitalize",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
