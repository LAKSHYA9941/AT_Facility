import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../utils/api";
import { SkeletonCard } from "../../components/SkeletonLoader";

// ── Types ──────────────────────────────────────────────

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  status: "ACTIVE" | "BANNED";
  idProofType: string | null;
  idVerified: boolean;
  idSubmittedAt: string | null;
  profileComplete: boolean;
  createdAt: string;
};

type DriverProfile = {
  id: string;
  kycStatus: string;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  segment: string | null;
  strikes: number;
  vehicle: {
    make: string;
    model: string;
    plateNumber: string;
    segment: string;
    color: string;
  } | null;
};

type Driver = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  status: "ACTIVE" | "BANNED";
  createdAt: string;
  driverProfile: DriverProfile | null;
};

// ── Badge styles ──────────────────────────────────────

const KYC_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  VERIFIED: { bg: "#EAF3DE", text: "#3B6D11", label: "Verified" },
  PENDING: { bg: "#FAEEDA", text: "#854F0B", label: "Pending" },
  REJECTED: { bg: "#FCEBEB", text: "#A32D2D", label: "Rejected" },
  UNSUBMITTED: { bg: "#EEF2F7", text: "#9CA3AF", label: "Not Submitted" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "#EAF3DE", text: "#3B6D11" },
  BANNED: { bg: "#FCEBEB", text: "#A32D2D" },
};

const ID_STATUS = (c: Customer) => {
  if (c.idVerified)
    return { bg: "#EAF3DE", text: "#3B6D11", label: "ID Verified" };
  if (c.idSubmittedAt)
    return { bg: "#FAEEDA", text: "#854F0B", label: "ID Pending" };
  return { bg: "#EEF2F7", text: "#9CA3AF", label: "No ID" };
};

const PAGE_SIZE = 20;

export default function UsersScreen() {
  const [tab, setTab] = useState<"customers" | "drivers">("customers");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | Driver | null>(null);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersHasMore, setCustomersHasMore] = useState(true);
  const [customersTotal, setCustomersTotal] = useState(0);

  // Driver state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversPage, setDriversPage] = useState(1);
  const [driversHasMore, setDriversHasMore] = useState(true);
  const [driversTotal, setDriversTotal] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [banLoading, setBanLoading] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch customers ──────────────────────────────────

  const fetchCustomers = useCallback(
    async (page = 1, searchTerm = "", append = false) => {
      try {
        if (page === 1 && !append) setCustomersLoading(true);
        if (append) setLoadingMore(true);

        const res = await api.get("/api/admin/users/customers", {
          params: { page, limit: PAGE_SIZE, search: searchTerm || undefined },
        });

        const data = res.data.data;
        if (append) {
          setCustomers((prev) => [...prev, ...data.items]);
        } else {
          setCustomers(data.items);
        }
        setCustomersTotal(data.total);
        setCustomersHasMore(data.hasMore);
        setCustomersPage(page);
      } catch (err: any) {
        console.error("Fetch customers error:", err.message);
      } finally {
        setCustomersLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // ── Fetch drivers ──────────────────────────────────

  const fetchDrivers = useCallback(
    async (page = 1, searchTerm = "", append = false) => {
      try {
        if (page === 1 && !append) setDriversLoading(true);
        if (append) setLoadingMore(true);

        const res = await api.get("/api/admin/users/drivers", {
          params: { page, limit: PAGE_SIZE, search: searchTerm || undefined },
        });

        const data = res.data.data;
        if (append) {
          setDrivers((prev) => [...prev, ...data.items]);
        } else {
          setDrivers(data.items);
        }
        setDriversTotal(data.total);
        setDriversHasMore(data.hasMore);
        setDriversPage(page);
      } catch (err: any) {
        console.error("Fetch drivers error:", err.message);
      } finally {
        setDriversLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // ── Initial load ──────────────────────────────────

  useEffect(() => {
    fetchCustomers();
    fetchDrivers();
  }, [fetchCustomers, fetchDrivers]);

  // ── Debounced search ──────────────────────────────

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (tab === "customers") {
        fetchCustomers(1, search);
      } else {
        fetchDrivers(1, search);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, tab]);

  // ── Load more ──────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    if (tab === "customers" && customersHasMore) {
      fetchCustomers(customersPage + 1, search, true);
    } else if (tab === "drivers" && driversHasMore) {
      fetchDrivers(driversPage + 1, search, true);
    }
  }, [
    tab,
    customersHasMore,
    driversHasMore,
    customersPage,
    driversPage,
    search,
    loadingMore,
    fetchCustomers,
    fetchDrivers,
  ]);

  // ── Pull to refresh ──────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === "customers") {
      await fetchCustomers(1, search);
    } else {
      await fetchDrivers(1, search);
    }
    setRefreshing(false);
  }, [tab, search, fetchCustomers, fetchDrivers]);

  // ── Toggle ban ──────────────────────────────────

  const toggleBan = useCallback(async (userId: string) => {
    try {
      setBanLoading(userId);
      const res = await api.put(`/api/admin/users/${userId}/ban`);
      const updated = res.data.data;

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === userId ? { ...c, status: updated.status } : c,
        ),
      );
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === userId ? { ...d, status: updated.status } : d,
        ),
      );
      setSelected(null);

      Alert.alert(
        "Success",
        `User has been ${updated.status === "BANNED" ? "banned" : "unbanned"}.`,
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update user status",
      );
    } finally {
      setBanLoading(null);
    }
  }, []);

  // ── Helpers ──────────────────────────────────

  const isDriver = (u: Customer | Driver): u is Driver => "driverProfile" in u;

  const getInitials = (name: string | null) =>
    (name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const isLoading = tab === "customers" ? customersLoading : driversLoading;
  const currentData = tab === "customers" ? customers : drivers;
  const totalCount = tab === "customers" ? customersTotal : driversTotal;

  // ── Render ──────────────────────────────────

  const renderCustomerItem = ({
    item: c,
    index: i,
  }: {
    item: Customer;
    index: number;
  }) => {
    const idBadge = ID_STATUS(c);
    return (
      <Animated.View entering={FadeInDown.delay(i * 30).springify()}>
        <TouchableOpacity
          onPress={() => setSelected(c)}
          activeOpacity={0.8}
          className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
        >
          <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
            <Text className="text-white font-bold text-sm">
              {getInitials(c.name)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-brand-text font-bold text-sm">
              {c.name || "Unnamed"}
            </Text>
            <Text className="text-brand-sub text-xs mt-0.5">{c.phone}</Text>
            <Text className="text-brand-sub text-xs">
              Joined{" "}
              {new Date(c.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <View className="items-end gap-1">
            <View
              style={{
                backgroundColor: STATUS_BADGE[c.status]?.bg || "#EEF2F7",
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: STATUS_BADGE[c.status]?.text || "#9CA3AF",
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {c.status.toLowerCase()}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: idBadge.bg,
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{ color: idBadge.text, fontSize: 9, fontWeight: "700" }}
              >
                {idBadge.label}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDriverItem = ({
    item: d,
    index: i,
  }: {
    item: Driver;
    index: number;
  }) => {
    const dp = d.driverProfile;
    const kycBadge = KYC_BADGE[dp?.kycStatus || "UNSUBMITTED"];
    return (
      <Animated.View entering={FadeInDown.delay(i * 30).springify()}>
        <TouchableOpacity
          onPress={() => setSelected(d)}
          activeOpacity={0.8}
          className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
        >
          <View className="relative">
            <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
              <Text className="text-white font-bold text-sm">
                {getInitials(d.name)}
              </Text>
            </View>
            {dp?.isOnline && (
              <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-brand-text font-bold text-sm">
              {d.name || "Unnamed"}
            </Text>
            <Text className="text-brand-sub text-xs mt-0.5">
              {dp?.vehicle
                ? `${dp.vehicle.make} ${dp.vehicle.model} · ${dp.vehicle.plateNumber}`
                : "No vehicle registered"}
            </Text>
            <Text className="text-brand-sub text-xs">
              {dp && dp.totalTrips > 0
                ? `★ ${dp.rating.toFixed(1)} · ${dp.totalTrips} trips`
                : "No trips yet"}
            </Text>
          </View>
          <View className="items-end gap-1">
            <View
              style={{
                backgroundColor: kycBadge.bg,
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: kycBadge.text,
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {kycBadge.label}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: STATUS_BADGE[d.status]?.bg || "#EEF2F7",
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: STATUS_BADGE[d.status]?.text || "#9CA3AF",
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {d.status.toLowerCase()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    return <View style={{ height: 24 }} />;
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-brand-border">
        <Text className="text-brand-text font-bold text-xl mb-3">Users</Text>

        {/* Tab toggle */}
        <View className="flex-row bg-brand-input rounded-2xl p-1 mb-3">
          {(["customers", "drivers"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setTab(t);
                setSearch("");
              }}
              activeOpacity={0.8}
              className="flex-1 py-2.5 rounded-xl items-center"
              style={{ backgroundColor: tab === t ? "#1B4F8A" : "transparent" }}
            >
              <Text
                style={{
                  color: tab === t ? "#fff" : "#9CA3AF",
                  fontWeight: "700",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {t} ({t === "customers" ? customersTotal : driversTotal})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View className="flex-row items-center gap-2 bg-brand-input border border-brand-border rounded-2xl px-4 h-12">
          <Text className="text-brand-sub">🔍</Text>
          <TextInput
            className="flex-1 text-brand-text text-sm"
            placeholder={`Search ${tab}...`}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: "#9CA3AF", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <ScrollView>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={currentData as any[]}
          renderItem={
            tab === "customers"
              ? (renderCustomerItem as any)
              : (renderDriverItem as any)
          }
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
              <Text className="text-brand-text font-bold text-base">
                No {tab} found
              </Text>
              <Text className="text-brand-sub text-sm mt-1">
                {search ? "Try a different search term" : "No data available"}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1B4F8A"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        />
        {selected && (
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

            {/* Avatar + name */}
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
                  backgroundColor: "#1B4F8A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 18 }}
                >
                  {getInitials(selected.name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#111827", fontWeight: "700", fontSize: 17 }}
                >
                  {selected.name || "Unnamed"}
                </Text>
                {(selected as any).email && (
                  <Text
                    style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}
                  >
                    {(selected as any).email}
                  </Text>
                )}
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                  {selected.phone}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            {isDriver(selected) ? (
              <View
                style={{
                  backgroundColor: "#EEF2F7",
                  borderRadius: 16,
                  padding: 14,
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <InfoRow
                  label="Vehicle"
                  value={
                    selected.driverProfile?.vehicle
                      ? `${selected.driverProfile.vehicle.make} ${selected.driverProfile.vehicle.model} · ${selected.driverProfile.vehicle.plateNumber}`
                      : "Not registered"
                  }
                />
                <InfoRow
                  label="Rating"
                  value={
                    selected.driverProfile &&
                    selected.driverProfile.totalTrips > 0
                      ? `★ ${selected.driverProfile.rating.toFixed(1)} · ${selected.driverProfile.totalTrips} trips`
                      : "No trips yet"
                  }
                />
                <InfoRow
                  label="KYC Status"
                  value={
                    KYC_BADGE[
                      selected.driverProfile?.kycStatus || "UNSUBMITTED"
                    ].label
                  }
                  valueColor={
                    KYC_BADGE[
                      selected.driverProfile?.kycStatus || "UNSUBMITTED"
                    ].text
                  }
                />
                <InfoRow
                  label="Segment"
                  value={
                    selected.driverProfile?.vehicle?.segment ||
                    selected.driverProfile?.segment ||
                    "—"
                  }
                />
                <InfoRow
                  label="Online now"
                  value={selected.driverProfile?.isOnline ? "Yes" : "No"}
                  valueColor={
                    selected.driverProfile?.isOnline ? "#16a34a" : "#9CA3AF"
                  }
                />
                <InfoRow
                  label="Earnings"
                  value={`₹${selected.driverProfile?.totalEarnings?.toLocaleString() || 0}`}
                />
                <InfoRow
                  label="Strikes"
                  value={`${selected.driverProfile?.strikes || 0}/3`}
                  valueColor={
                    (selected.driverProfile?.strikes || 0) >= 2
                      ? "#A32D2D"
                      : "#111827"
                  }
                />
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: "#EEF2F7",
                  borderRadius: 16,
                  padding: 14,
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <InfoRow
                  label="ID Proof"
                  value={
                    (selected as Customer).idVerified
                      ? `${(selected as Customer).idProofType || "ID"} ✓ Verified`
                      : (selected as Customer).idSubmittedAt
                        ? `${(selected as Customer).idProofType || "ID"} — Pending`
                        : "Not submitted"
                  }
                  valueColor={
                    (selected as Customer).idVerified
                      ? "#3B6D11"
                      : (selected as Customer).idSubmittedAt
                        ? "#854F0B"
                        : "#9CA3AF"
                  }
                />
                <InfoRow
                  label="Profile complete"
                  value={(selected as Customer).profileComplete ? "Yes" : "No"}
                />
                <InfoRow
                  label="Member since"
                  value={new Date(selected.createdAt).toLocaleDateString(
                    "en-IN",
                    { month: "long", year: "numeric" },
                  )}
                />
                <InfoRow
                  label="Status"
                  value={selected.status.toLowerCase()}
                  valueColor={STATUS_BADGE[selected.status]?.text}
                />
              </View>
            )}

            {/* Ban / Unban */}
            <TouchableOpacity
              onPress={() => toggleBan(selected.id)}
              disabled={banLoading === selected.id}
              activeOpacity={0.9}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor:
                  selected.status === "ACTIVE" ? "#FCEBEB" : "#EAF3DE",
                opacity: banLoading === selected.id ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: selected.status === "ACTIVE" ? "#A32D2D" : "#3B6D11",
                }}
              >
                {banLoading === selected.id
                  ? "Updating..."
                  : selected.status === "ACTIVE"
                    ? "🚫  Ban this user"
                    : "✅  Unban this user"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper component ──────────────────────────────────

function InfoRow({
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
