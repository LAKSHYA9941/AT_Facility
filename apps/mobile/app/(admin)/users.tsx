// apps/mobile/app/(admin)/users.tsx
// Full replacement — wires to real API with pagination + search + ban toggle

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../utils/api";

// ── Types ───────────────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: "ACTIVE" | "BANNED" | "PENDING";
  profileComplete: boolean;
  createdAt: string;
  // driver-only fields
  driverProfile?: {
    kycStatus: string;
    isOnline: boolean;
    rating: number;
    totalTrips: number;
  } | null;
};

type Tab = "customers" | "drivers";

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View className="bg-white rounded-xl border-[0.5px] border-brand-border p-4 mb-2.5">
      <View className="h-3.5 w-1/2 bg-brand-bg rounded-md mb-2" />
      <View className="h-3 w-[35%] bg-brand-bg rounded-md" />
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(
    async (opts: { tab: Tab; q: string; pg: number; reset?: boolean }) => {
      if (loading && !opts.reset) return;
      setLoading(true);
      try {
        const endpoint =
          opts.tab === "customers"
            ? "/api/admin/users/customers"
            : "/api/admin/users/drivers";

        const { data } = await api.get(endpoint, {
          params: { page: opts.pg, limit: 20, search: opts.q },
        });

        const incoming: UserItem[] = data.data?.items ?? [];
        setUsers((prev) => (opts.reset ? incoming : [...prev, ...incoming]));
        setHasMore(data.data?.hasMore ?? false);
        setPage(opts.pg);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Initial load + tab change
  React.useEffect(() => {
    fetchUsers({ tab: activeTab, q: search, pg: 1, reset: true });
  }, [activeTab]);

  // Debounced search
  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchUsers({ tab: activeTab, q: text, pg: 1, reset: true });
    }, 300);
  };

  // Pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers({ tab: activeTab, q: search, pg: 1, reset: true });
  };

  // Infinite scroll
  const handleEndReached = () => {
    if (!loading && hasMore) {
      fetchUsers({ tab: activeTab, q: search, pg: page + 1 });
    }
  };

  // ── Ban toggle ─────────────────────────────────────────────────────────────

  const handleBanToggle = async (user: UserItem) => {
    const action = user.status === "BANNED" ? "unban" : "ban";
    Alert.alert(
      `${action === "ban" ? "Ban" : "Unban"} user?`,
      `Are you sure you want to ${action} ${user.name ?? user.phone}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: action === "ban" ? "destructive" : "default",
          onPress: async () => {
            setBanLoading(true);
            try {
              await api.put(`/api/admin/users/${user.id}/ban`);
              // Optimistic update
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id
                    ? {
                        ...u,
                        status: u.status === "BANNED" ? "ACTIVE" : "BANNED",
                      }
                    : u,
                ),
              );
              if (selectedUser?.id === user.id) {
                setSelectedUser((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: prev.status === "BANNED" ? "ACTIVE" : "BANNED",
                      }
                    : null,
                );
              }
            } catch (err) {
              Alert.alert("Error", "Failed to update user status.");
            } finally {
              setBanLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Render user card ───────────────────────────────────────────────────────

  const renderItem = ({ item, index }: { item: UserItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <TouchableOpacity
        onPress={() => setSelectedUser(item)}
        className="bg-white rounded-xl border-[0.5px] border-brand-border p-4 mb-2.5 flex-row items-center justify-between"
        activeOpacity={0.7}
      >
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-gray-900">
            {item.name ?? "—"}
          </Text>
          <Text className="text-[13px] text-gray-400 mt-0.5">{item.phone}</Text>
          {activeTab === "drivers" && item.driverProfile && (
            <Text className="text-[12px] text-gray-400 mt-0.5">
              KYC: {item.driverProfile.kycStatus} · Trips:{" "}
              {item.driverProfile.totalTrips}
            </Text>
          )}
        </View>

        <View className="items-end gap-1">
          <View
            className={`px-2 py-1 rounded-full ${
              item.status === "ACTIVE"
                ? "bg-green-100"
                : item.status === "BANNED"
                  ? "bg-red-100"
                  : "bg-yellow-100"
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                item.status === "ACTIVE"
                  ? "text-green-800"
                  : item.status === "BANNED"
                    ? "text-red-800"
                    : "text-yellow-800"
              }`}
            >
              {item.status}
            </Text>
          </View>
          {activeTab === "drivers" && item.driverProfile?.isOnline && (
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Detail modal ───────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedUser) return null;
    const u = selectedUser;
    return (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 bg-white border-b-[0.5px] border-brand-border">
            <Text className="text-[17px] font-bold text-gray-900">
              User Detail
            </Text>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Text className="text-[15px] text-brand-primary">Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {[
              { label: "Name", value: u.name ?? "—" },
              { label: "Phone", value: u.phone },
              { label: "Email", value: u.email ?? "—" },
              { label: "Status", value: u.status },
              {
                label: "Profile complete",
                value: u.profileComplete ? "Yes" : "No",
              },
              {
                label: "Joined",
                value: new Date(u.createdAt).toLocaleDateString("en-IN"),
              },
              ...(u.driverProfile
                ? [
                    { label: "KYC", value: u.driverProfile.kycStatus },
                    {
                      label: "Rating",
                      value: u.driverProfile.rating.toFixed(1),
                    },
                    {
                      label: "Total trips",
                      value: String(u.driverProfile.totalTrips),
                    },
                    {
                      label: "Online now",
                      value: u.driverProfile.isOnline ? "Yes" : "No",
                    },
                  ]
                : []),
            ].map(({ label, value }) => (
              <View
                key={label}
                className="flex-row justify-between py-2.5 border-b-[0.5px] border-brand-border"
              >
                <Text className="text-gray-400 text-sm">{label}</Text>
                <Text className="text-gray-900 text-sm font-medium">
                  {value}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => handleBanToggle(u)}
              disabled={banLoading}
              className={`mt-6 rounded-xl p-3.5 items-center ${
                u.status === "BANNED" ? "bg-brand-primary" : "bg-red-100"
              }`}
            >
              {banLoading ? (
                <ActivityIndicator
                  color={u.status === "BANNED" ? "#fff" : "#991B1B"}
                />
              ) : (
                <Text
                  className={`font-bold text-[15px] ${
                    u.status === "BANNED" ? "text-white" : "text-red-800"
                  }`}
                >
                  {u.status === "BANNED" ? "Unban User" : "Ban User"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Tab switcher */}
      <View className="flex-row bg-brand-bg m-4 rounded-[10px] p-[3px]">
        {(["customers", "drivers"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab ? "bg-white" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-sm capitalize ${
                activeTab === tab
                  ? "font-bold text-brand-primary"
                  : "font-medium text-gray-400"
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View className="px-4 mb-3">
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search by name or phone..."
          placeholderTextColor="#9CA3AF"
          className="bg-brand-bg rounded-[10px] p-3 text-sm text-gray-900 border-[0.5px] border-brand-border"
        />
      </View>

      {/* List */}
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : (
            <Text className="text-center text-gray-400 mt-10">
              No {activeTab} found
            </Text>
          )
        }
        ListFooterComponent={
          loading && users.length > 0 ? (
            <ActivityIndicator className="my-4" color="#1B4F8A" />
          ) : null
        }
      />

      {renderModal()}
    </View>
  );
}
