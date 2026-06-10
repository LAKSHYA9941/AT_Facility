import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../../store/auth";
import { useMockStore } from "../../store/mock";
import { api } from "../../utils/api";
import {
  Phone,
  ChevronRight,
  MapPin,
  Shield,
  CreditCard,
  Bell,
  Globe,
  Star,
  HelpCircle,
  LogOut,
  Trash2,
  Car,
  Clock,
  Wallet,
  Tag,
  Heart,
  Lock,
} from "lucide-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTrip = {
  id: string;
  status: string;
  startOtp?: string;
  totalFare: number;
  amountPaidUpfront: number;
  balanceRemaining: number;
  waypoints: { address: string; lat: number; lng: number }[];
  driver?: {
    name?: string;
    phone?: string;
    vehicleModel?: string;
    plateNumber?: string;
    user?: { name?: string; phone?: string };
    vehicle?: { model?: string; plateNumber?: string };
  } | null;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "#1d4ed8",
    bg: "#eff6ff",
    dot: "#3b82f6",
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    color: "#065f46",
    bg: "#ecfdf5",
    dot: "#22c55e",
  },
  DRIVER_ENROUTE: {
    label: "Driver En Route",
    color: "#4338ca",
    bg: "#eef2ff",
    dot: "#818cf8",
  },
  ACTIVE: {
    label: "Trip Active",
    color: "#92400e",
    bg: "#fffbeb",
    dot: "#f59e0b",
  },
};

const ACTIVE_STATUSES = [
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_ENROUTE",
  "ACTIVE",
];
const OTP_STATUSES = ["CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_ENROUTE"];

// ─── Active Trip Card ─────────────────────────────────────────────────────────

function ActiveTripCard({ trip }: { trip: ActiveTrip }) {
  const meta = STATUS_META[trip.status] ?? {
    label: trip.status,
    color: "#374151",
    bg: "#f9fafb",
    dot: "#6b7280",
  };

  const waypoints = trip.waypoints ?? [];
  const pickup = waypoints[0]?.address?.split(",")[0] ?? "Pickup";
  const drop =
    waypoints[waypoints.length - 1]?.address?.split(",")[0] ?? "Destination";

  const driverName = trip.driver?.name ?? trip.driver?.user?.name ?? null;
  const driverPhone = trip.driver?.phone ?? trip.driver?.user?.phone ?? null;
  const vehicleModel =
    trip.driver?.vehicleModel ?? trip.driver?.vehicle?.model ?? "Vehicle";
  const plateNumber =
    trip.driver?.plateNumber ?? trip.driver?.vehicle?.plateNumber ?? "—";

  const showOtp = OTP_STATUSES.includes(trip.status) && trip.startOtp;

  return (
    <Animated.View
      entering={FadeInDown.delay(60).springify()}
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#fff",
        shadowColor: "#1B4F8A",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        borderWidth: 1,
        borderColor: "#DDE3ED",
      }}
    >
      {/* Header bar */}
      <View
        style={{
          backgroundColor: "#1B4F8A",
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Car size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
            Active Trip
          </Text>
        </View>
        {/* Status badge */}
        <View
          style={{
            backgroundColor: meta.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: meta.dot,
            }}
          />
          <Text style={{ color: meta.color, fontSize: 11, fontWeight: "700" }}>
            {meta.label}
          </Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Route */}
        <View
          style={{
            backgroundColor: "#F4F6F9",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#22c55e",
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: "#111827",
                fontWeight: "600",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {pickup}
            </Text>
          </View>
          <View
            style={{
              width: 1,
              height: 10,
              backgroundColor: "#DDE3ED",
              marginLeft: 3.5,
              marginBottom: 6,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#ef4444",
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: "#111827",
                fontWeight: "600",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {drop}
            </Text>
          </View>
        </View>

        {/* Driver info (if assigned) */}
        {driverName && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#EEF2F7",
              borderRadius: 12,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#1B4F8A",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {driverName.substring(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontWeight: "700", color: "#111827", fontSize: 14 }}
              >
                {driverName}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 1 }}>
                {vehicleModel} · {plateNumber}
              </Text>
            </View>
            {driverPhone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#1B4F8A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Phone size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* OTP */}
        {showOtp && (
          <View
            style={{
              backgroundColor: "#1B4F8A",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Share this PIN with your driver to start the trip
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 36,
                fontWeight: "800",
                letterSpacing: 10,
                fontVariant: ["tabular-nums"],
              }}
            >
              {trip.startOtp}
            </Text>
          </View>
        )}

        {/* Payment breakdown */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#DDE3ED",
            paddingTop: 12,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Total Fare</Text>
            <Text style={{ fontWeight: "700", color: "#111827", fontSize: 13 }}>
              ₹{trip.totalFare?.toLocaleString("en-IN")}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Paid Online</Text>
            <Text style={{ fontWeight: "700", color: "#16a34a", fontSize: 13 }}>
              ₹{trip.amountPaidUpfront?.toLocaleString("en-IN")} (Paid)
            </Text>
          </View>
          {trip.balanceRemaining > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: "#fff7ed",
                marginHorizontal: -4,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 8,
                marginTop: 2,
              }}
            >
              <Text
                style={{ color: "#9a3412", fontSize: 13, fontWeight: "700" }}
              >
                Balance to Driver
              </Text>
              <Text
                style={{ fontWeight: "800", color: "#ea580c", fontSize: 13 }}
              >
                ₹{trip.balanceRemaining?.toLocaleString("en-IN")}
              </Text>
            </View>
          )}
        </View>

        {/* View trip CTA */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(customer)/active-trip",
              params: { tripId: trip.id },
            })
          }
          style={{
            marginTop: 14,
            backgroundColor: "#1B4F8A",
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
            View Full Trip Details
          </Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

type MenuItem = {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  badge?: string;
  danger?: boolean;
  toggle?: boolean;
  onPress?: () => void;
};

function MenuRow({ item, delay }: { item: MenuItem; delay: number }) {
  const [toggled, setToggled] = useState(true);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        onPress={item.onPress}
        activeOpacity={item.toggle ? 1 : 0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#DDE3ED",
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: item.danger ? "#FEF2F2" : "#F4F6F9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <item.Icon size={18} color={item.danger ? "#ef4444" : "#1B4F8A"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: "600",
              fontSize: 14,
              color: item.danger ? "#ef4444" : "#111827",
            }}
          >
            {item.label}
          </Text>
          {item.sub && (
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
              {item.sub}
            </Text>
          )}
        </View>
        {item.badge && (
          <View
            style={{
              backgroundColor: "#1B4F8A",
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 5,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              {item.badge}
            </Text>
          </View>
        )}
        {item.toggle ? (
          <Switch
            value={toggled}
            onValueChange={setToggled}
            trackColor={{ false: "#DDE3ED", true: "#1B4F8A" }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        ) : (
          !item.danger && <ChevronRight size={16} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isMockMode, activeMockTrip } = useMockStore();

  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ── Load active trip ──
  const loadTrip = useCallback(async () => {
    // Mock mode: read from mock store
    if (isMockMode && activeMockTrip) {
      if (ACTIVE_STATUSES.includes(activeMockTrip.status)) {
        setActiveTrip({
          id: activeMockTrip.tripId,
          status: activeMockTrip.status,
          startOtp: activeMockTrip.startOtp,
          totalFare: activeMockTrip.totalFare,
          amountPaidUpfront: activeMockTrip.amountPaidUpfront,
          balanceRemaining: activeMockTrip.balanceRemaining,
          waypoints: activeMockTrip.waypoints,
          driver: activeMockTrip.driver
            ? {
                name: activeMockTrip.driver.name,
                phone: activeMockTrip.driver.phone,
                vehicleModel: activeMockTrip.driver.vehicleModel,
                plateNumber: activeMockTrip.driver.plateNumber,
              }
            : null,
        });
      } else {
        setActiveTrip(null);
      }
      setTripLoading(false);
      return;
    }

    // Real mode
    try {
      const res = await api.get("/api/trips/my");
      const data = res.data.data;
      const trips: any[] = Array.isArray(data) ? data : (data?.trips ?? []);
      const found = trips.find((t) => ACTIVE_STATUSES.includes(t.status));
      setActiveTrip(found ?? null);
    } catch {
      setActiveTrip(null);
    } finally {
      setTripLoading(false);
    }
  }, [isMockMode, activeMockTrip]);

  // ── Load wallet balance ──
  const loadWallet = useCallback(async () => {
    try {
      const res = await api.get("/api/customer/wallet");
      setWalletBalance(res.data.data?.balance ?? res.data.data ?? null);
    } catch {
      // Endpoint may not exist yet — silently ignore
    }
  }, []);

  useEffect(() => {
    loadTrip();
    loadWallet();
  }, [loadTrip, loadWallet]);

  // Re-load when mock trip status changes
  useEffect(() => {
    if (isMockMode) loadTrip();
  }, [activeMockTrip?.status, activeMockTrip?.driver]);

  // ── ID verification menu item ──
  let idVerificationItem: MenuItem = {
    Icon: Lock,
    label: "Identity Verification",
    onPress: () => router.push("/(auth)/complete-profile"),
  };
  if (user?.idVerified) {
    idVerificationItem = {
      Icon: Shield,
      label: "Identity Verified",
      sub: "Verified",
    };
  } else if (user?.idSubmittedAt) {
    idVerificationItem = {
      Icon: Clock,
      label: "Verification Pending",
      onPress: () => router.push("/(auth)/pending-verification"),
    };
  }

  const walletDisplay =
    walletBalance != null
      ? `₹${walletBalance.toLocaleString("en-IN")}`
      : "₹340.00";

  const SECTIONS: { title: string; items: MenuItem[] }[] = [
    {
      title: "Payments",
      items: [
        {
          Icon: CreditCard,
          label: "Saved Cards",
          sub: "Visa ···· 4242",
        },
        {
          Icon: Wallet,
          label: "Facility Wallet",
          sub: `${walletDisplay} available`,
        },
        {
          Icon: Tag,
          label: "Promo Codes",
          sub: "FACILITY20 active",
          badge: "1",
        },
      ],
    },
    {
      title: "Trips",
      items: [
        {
          Icon: MapPin,
          label: "Saved Addresses",
          sub: "Home, Office",
        },
        {
          Icon: Heart,
          label: "Favourite Drivers",
          sub: "3 drivers",
        },
        {
          Icon: Bell,
          label: "Ride Notifications",
          toggle: true,
        },
      ],
    },
    {
      title: "Account",
      items: [
        idVerificationItem,
        { Icon: Shield, label: "Privacy & Safety" },
        {
          Icon: Globe,
          label: "Language",
          sub: "English",
        },
        { Icon: Star, label: "Rate the App" },
        { Icon: HelpCircle, label: "Help & Support" },
      ],
    },
    {
      title: "Danger Zone",
      items: [
        {
          Icon: LogOut,
          label: "Log Out",
          danger: true,
          onPress: () => logout(),
        },
        {
          Icon: Trash2,
          label: "Delete Account",
          danger: true,
        },
      ],
    },
  ];

  return (
    <View
      style={{ flex: 1, backgroundColor: "#EEF2F7", paddingTop: insets.top }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Profile Header ── */}
        <Animated.View
          entering={FadeInDown.delay(40).springify()}
          style={{
            backgroundColor: "#1B4F8A",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {/* Avatar */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  color: "#1B4F8A",
                  fontWeight: "800",
                  fontSize: 22,
                }}
              >
                {user?.name ? user.name.substring(0, 2).toUpperCase() : "US"}
              </Text>
            </View>

            {/* Name/info */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 18,
                  lineHeight: 22,
                }}
              >
                {user?.name || "User"}
              </Text>
              {user?.email && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {user.email}
                </Text>
              )}
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  marginTop: 1,
                }}
              >
                {user?.phone}
              </Text>
            </View>

            {/* Edit button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.4)",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wallet strip */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Wallet size={18} color="#fff" />
              <View>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                  Facility Wallet
                </Text>
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  {walletDisplay}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  color: "#1B4F8A",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                Add Money
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Active Trip Card ── */}
        {tripLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator color="#1B4F8A" size="small" />
          </View>
        ) : activeTrip ? (
          <>
            <Text
              style={{
                color: "#6B7280",
                fontWeight: "700",
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 4,
              }}
            >
              Current Trip
            </Text>
            <ActiveTripCard trip={activeTrip} />
          </>
        ) : null}

        {/* ── Sections ── */}
        {SECTIONS.map((section, si) => (
          <View key={section.title}>
            <Text
              style={{
                color: "#6B7280",
                fontWeight: "700",
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 6,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                backgroundColor: "#fff",
                marginHorizontal: 0,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: "#DDE3ED",
              }}
            >
              {section.items.map((item, ii) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  delay={80 + si * 40 + ii * 20}
                />
              ))}
            </View>
          </View>
        ))}

        {/* App version */}
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 12,
            textAlign: "center",
            paddingVertical: 24,
          }}
        >
          At Facility v1.0.0 · © 2024
        </Text>
      </ScrollView>
    </View>
  );
}
