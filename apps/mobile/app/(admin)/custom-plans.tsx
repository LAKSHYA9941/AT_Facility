// apps/mobile/app/(admin)/custom-plans.tsx
// New admin tab — shows all submitted custom plans (customer + driver)

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../utils/api";
import {
  Phone,
  Map,
  Users,
  Hotel,
  MessageSquare,
  CheckCircle,
} from "lucide-react-native";

type PlanStatus = "NEW" | "REVIEWED" | "QUOTED" | "ACCEPTED" | "REJECTED";

type CustomPlan = {
  id: string;
  submittedByRole: "CUSTOMER" | "DRIVER";
  pickupLocation: string;
  destinations: string[];
  numberOfTravellers: number;
  budgetMin: number;
  budgetMax: number;
  carType: string | null;
  hotelRequired: boolean;
  additionalNotes: string | null;
  status: PlanStatus;
  adminNotes: string | null;
  quotedAmount: number | null;
  assignedDriverId: string | null;
  driverEarning: number | null;
  platformCommission: number | null;
  createdAt: string;
  user: {
    name: string | null;
    phone: string;
    role: string;
  };
};

const STATUS_FILTERS: { label: string; value: PlanStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "New", value: "NEW" },
  { label: "Reviewed", value: "REVIEWED" },
  { label: "Quoted", value: "QUOTED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
];

const STATUS_COLORS: Record<PlanStatus, { bg: string; text: string }> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-700" },
  REVIEWED: { bg: "bg-yellow-100", text: "text-yellow-800" },
  QUOTED: { bg: "bg-indigo-100", text: "text-indigo-800" },
  ACCEPTED: { bg: "bg-green-100", text: "text-green-800" },
  REJECTED: { bg: "bg-red-100", text: "text-red-800" },
};

function formatBudget(min: number, max: number) {
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `₹${(n / 1000).toFixed(0)}k`
        : `₹${n}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  index,
  onPress,
}: {
  plan: CustomPlan;
  index: number;
  onPress: () => void;
}) {
  const { bg, text } = STATUS_COLORS[plan.status];
  const routeSummary =
    plan.destinations.length > 1
      ? `${plan.pickupLocation} → ${plan.destinations[0]} +${plan.destinations.length - 1}`
      : `${plan.pickupLocation} → ${plan.destinations[0] ?? "TBD"}`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        onPress={onPress}
        className="bg-white rounded-2xl border-[0.5px] border-brand-border p-4 mb-2.5"
        activeOpacity={0.75}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View
              className={`px-2 py-1 rounded-full ${
                plan.submittedByRole === "CUSTOMER"
                  ? "bg-blue-100"
                  : "bg-green-100"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  plan.submittedByRole === "CUSTOMER"
                    ? "text-blue-700"
                    : "text-green-800"
                }`}
              >
                {plan.submittedByRole}
              </Text>
            </View>
            <Text className="text-[13px] font-semibold text-gray-900">
              {plan.user.name ?? "Unknown"}
            </Text>
          </View>
          <View className={`${bg} px-2 py-1 rounded-full`}>
            <Text className={`text-[11px] font-semibold ${text}`}>
              {plan.status}
            </Text>
          </View>
        </View>

        {/* Phone (always visible) */}
        <View className="flex-row items-center gap-1 mb-1.5">
          <Phone size={11} color="#9CA3AF" />
          <Text className="text-xs text-gray-400">{plan.user.phone}</Text>
        </View>

        {/* Route */}
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Map size={13} color="#4B5563" />
          <Text className="text-sm font-medium text-gray-700">
            {routeSummary}
          </Text>
        </View>

        {/* Details row */}
        <View className="flex-row flex-wrap gap-1.5 mt-1">
          <View className="bg-brand-bg px-2 py-1 rounded-full flex-row items-center gap-1">
            <Users size={10} color="#4B5563" />
            <Text className="text-[11px] text-gray-700">
              {plan.numberOfTravellers} Pax
            </Text>
          </View>
          <View className="bg-brand-bg px-2 py-1 rounded-full">
            <Text className="text-[11px] text-gray-700">
              {formatBudget(plan.budgetMin, plan.budgetMax)}
            </Text>
          </View>
          <View className="bg-brand-bg px-2 py-1 rounded-full">
            <Text className="text-[11px] text-gray-700">
              {plan.carType ?? "Any car"}
            </Text>
          </View>
          <View className="bg-brand-bg px-2 py-1 rounded-full flex-row items-center gap-1">
            {plan.hotelRequired && <Hotel size={10} color="#4B5563" />}
            <Text className="text-[11px] text-gray-700">
              {plan.hotelRequired ? "Hotel" : "No hotel"}
            </Text>
          </View>
        </View>

        <Text className="text-[11px] text-gray-400 mt-2">
          {timeAgo(plan.createdAt)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Detail bottom-sheet modal ────────────────────────────────────────────────

function PlanDetailModal({
  plan,
  onClose,
  onUpdate,
}: {
  plan: CustomPlan;
  onClose: () => void;
  onUpdate: (updated: Partial<CustomPlan>) => void;
}) {
  const [adminNotes, setAdminNotes] = useState(plan.adminNotes ?? "");
  const [quotedAmount, setQuotedAmount] = useState(
    plan.quotedAmount ? String(plan.quotedAmount) : "",
  );
  const [saving, setSaving] = useState(false);

  // Driver Assignment State
  const [showDriverAssignment, setShowDriverAssignment] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [platformCommission, setPlatformCommission] = useState("");
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAvailableDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const res = await api.get("/api/admin/available-drivers");
      setDrivers(res.data.data ?? []);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch available drivers");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId)
      return Alert.alert("Validation", "Select a driver first");
    if (!platformCommission)
      return Alert.alert("Validation", "Enter platform commission");

    setAssigningDriver(true);
    try {
      const res = await api.post(
        `/api/admin/custom-plans/${plan.id}/assign-driver`,
        {
          driverProfileId: selectedDriverId,
          platformCommission: parseInt(platformCommission),
        },
      );
      onUpdate(res.data.data);
      Alert.alert("Success", "Driver assigned successfully");
      setShowDriverAssignment(false);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to assign driver",
      );
    } finally {
      setAssigningDriver(false);
    }
  };

  const updatePlan = async (status: PlanStatus) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/admin/custom-plans/${plan.id}`, {
        status,
        adminNotes: adminNotes || undefined,
        quotedAmount: quotedAmount ? parseInt(quotedAmount) : undefined,
      });
      onUpdate(data.data);
      onClose();
    } catch (err) {
      Alert.alert("Error", "Failed to update plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hi ${plan.user.name ?? ""}, we received your custom trip plan request on AT Facility. Let us discuss the details!`,
    );
    Linking.openURL(
      `https://wa.me/${plan.user.phone.replace("+", "")}?text=${msg}`,
    );
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 bg-white border-b-[0.5px] border-brand-border">
          <Text className="text-[17px] font-bold text-gray-900">
            Plan Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-[15px] text-brand-primary">Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Submitter info */}
          <View className="bg-white rounded-xl border-[0.5px] border-brand-border p-3.5 mb-3">
            <Text className="text-[13px] text-gray-400 mb-1">Submitted by</Text>
            <Text className="text-base font-bold text-gray-900">
              {plan.user.name ?? "Unknown"}{" "}
              <Text
                className={`text-xs font-semibold ${
                  plan.submittedByRole === "CUSTOMER"
                    ? "text-blue-700"
                    : "text-green-800"
                }`}
              >
                ({plan.submittedByRole})
              </Text>
            </Text>
            <Text className="text-sm text-gray-700 mt-0.5">
              {plan.user.phone}
            </Text>

            <TouchableOpacity
              onPress={openWhatsApp}
              className="mt-2.5 bg-[#25D366] rounded-lg p-2.5 flex-row items-center justify-center gap-1.5"
            >
              <MessageSquare size={16} color="white" />
              <Text className="text-white font-bold text-sm">
                Contact on WhatsApp
              </Text>
            </TouchableOpacity>
          </View>

          {/* Plan details */}
          {[
            { label: "Pickup", value: plan.pickupLocation },
            { label: "Destinations", value: plan.destinations.join(", ") },
            { label: "Travellers", value: String(plan.numberOfTravellers) },
            {
              label: "Budget",
              value: formatBudget(plan.budgetMin, plan.budgetMax),
            },
            { label: "Car type", value: plan.carType ?? "Any" },
            {
              label: "Hotel required",
              value: plan.hotelRequired ? "Yes" : "No",
            },
            ...(plan.additionalNotes
              ? [{ label: "Notes from customer", value: plan.additionalNotes }]
              : []),
          ].map(({ label, value }) => (
            <View
              key={label}
              className="flex-row justify-between py-2.5 border-b-[0.5px] border-brand-border"
            >
              <Text className="text-[13px] text-gray-400">{label}</Text>
              <Text className="text-[13px] font-medium text-gray-900 flex-1 text-right ml-4">
                {value}
              </Text>
            </View>
          ))}

          {/* Admin inputs */}
          <Text className="text-sm font-semibold text-gray-700 mt-4 mb-1.5">
            Quote amount (₹)
          </Text>
          <TextInput
            value={quotedAmount}
            onChangeText={setQuotedAmount}
            keyboardType="number-pad"
            placeholder="e.g. 12500"
            placeholderTextColor="#9CA3AF"
            editable={plan.status !== "ACCEPTED"}
            className="bg-brand-bg rounded-[10px] p-3 text-sm text-gray-900 border-[0.5px] border-brand-border mb-3"
          />

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">
            Admin notes
          </Text>
          <TextInput
            value={adminNotes}
            onChangeText={setAdminNotes}
            multiline
            numberOfLines={3}
            placeholder="Internal notes about this plan..."
            placeholderTextColor="#9CA3AF"
            editable={plan.status !== "ACCEPTED"}
            className="bg-brand-bg rounded-[10px] p-3 text-sm text-gray-900 border-[0.5px] border-brand-border min-h-[80px] mb-5 text-left"
            style={{ textAlignVertical: "top" }}
          />

          {/* Driver Assignment Section for ACCEPTED plans */}
          {plan.status === "ACCEPTED" && (
            <View className="mb-5 bg-white border border-brand-border rounded-xl p-4 shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-2">
                Driver Assignment
              </Text>
              {plan.assignedDriverId ? (
                <View>
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <CheckCircle size={14} color="#16a34a" />
                    <Text className="text-sm text-green-700 font-semibold">
                      Driver Assigned
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-700">
                    Platform Commission: ₹{plan.platformCommission}
                  </Text>
                  <Text className="text-sm text-gray-700">
                    Driver Earning: ₹{plan.driverEarning}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    Total Quoted: ₹{plan.quotedAmount}
                  </Text>
                </View>
              ) : showDriverAssignment ? (
                <View>
                  {loadingDrivers ? (
                    <ActivityIndicator color="#1B4F8A" className="my-2" />
                  ) : (
                    <View>
                      <Text className="text-sm text-gray-600 mb-2">
                        Select an available driver:
                      </Text>
                      {drivers.length === 0 ? (
                        <Text className="text-sm text-red-600 mb-3">
                          No verified drivers available.
                        </Text>
                      ) : (
                        <View>
                          <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search driver by name or phone..."
                            className="bg-white rounded-lg p-2 text-sm text-gray-900 border border-gray-300 mb-2"
                          />
                          <ScrollView
                            style={{ maxHeight: 150 }}
                            keyboardShouldPersistTaps="handled"
                            className="mb-3 border border-gray-200 rounded-lg bg-gray-50 p-2"
                          >
                            {drivers
                              .filter(
                                (d) =>
                                  (d.user?.name || "")
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()) ||
                                  (d.user?.phone || "").includes(searchQuery),
                              )
                              .map((d) => (
                                <TouchableOpacity
                                  key={d.id}
                                  onPress={() => setSelectedDriverId(d.id)}
                                  className={`p-2 rounded border mb-1 ${selectedDriverId === d.id ? "bg-blue-100 border-blue-400" : "bg-white border-gray-200"}`}
                                >
                                  <Text className="font-semibold">
                                    {d.user?.name} ({d.user?.phone})
                                  </Text>
                                  <Text className="text-xs text-gray-500">
                                    {d.vehicle
                                      ? `${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.segment})`
                                      : "No vehicle info"}{" "}
                                    | Rating: {d.rating}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        </View>
                      )}
                      <Text className="text-sm text-gray-600 mb-1">
                        Platform Commission (₹):
                      </Text>
                      <TextInput
                        value={platformCommission}
                        onChangeText={setPlatformCommission}
                        keyboardType="number-pad"
                        placeholder="e.g. 500"
                        className="bg-brand-bg rounded-[10px] p-2 text-sm text-gray-900 border-[0.5px] border-brand-border mb-3"
                      />
                      {platformCommission !== "" && plan.quotedAmount && (
                        <Text className="text-xs text-gray-500 mb-3">
                          Driver will earn: ₹
                          {plan.quotedAmount -
                            parseInt(platformCommission || "0")}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={handleAssignDriver}
                        disabled={assigningDriver || !selectedDriverId}
                        className={`rounded-xl p-3 items-center ${assigningDriver || !selectedDriverId ? "bg-gray-400" : "bg-brand-primary"}`}
                      >
                        {assigningDriver ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text className="text-white font-bold">
                            Confirm Assignment
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setShowDriverAssignment(true);
                    fetchAvailableDrivers();
                  }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-3 items-center"
                >
                  <Text className="text-blue-700 font-bold">
                    Assign Driver Now
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action buttons */}
          {saving ? (
            <ActivityIndicator color="#1B4F8A" className="my-5" />
          ) : (
            <View className="gap-2.5">
              {plan.status === "NEW" && (
                <TouchableOpacity
                  onPress={() => updatePlan("REVIEWED")}
                  className="bg-brand-primary rounded-xl p-3.5 items-center"
                >
                  <Text className="text-white font-bold text-[15px]">
                    Mark as Reviewed
                  </Text>
                </TouchableOpacity>
              )}
              {(plan.status === "NEW" || plan.status === "REVIEWED") &&
                quotedAmount !== "" && (
                  <TouchableOpacity
                    onPress={() => updatePlan("QUOTED")}
                    className="bg-purple-600 rounded-xl p-3.5 items-center"
                  >
                    <Text className="text-white font-bold text-[15px]">
                      Send Quote ₹
                      {parseInt(quotedAmount || "0").toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                )}
              {plan.status === "QUOTED" && (
                <TouchableOpacity
                  onPress={() => updatePlan("ACCEPTED")}
                  className="bg-emerald-700 rounded-xl p-3.5 items-center"
                >
                  <Text className="text-white font-bold text-[15px]">
                    Bypass Payment & Accept
                  </Text>
                </TouchableOpacity>
              )}
              {plan.status !== "REJECTED" && plan.status !== "ACCEPTED" && (
                <TouchableOpacity
                  onPress={() => updatePlan("REJECTED")}
                  className="bg-red-100 rounded-xl p-3.5 items-center"
                >
                  <Text className="text-red-800 font-bold text-[15px]">
                    Reject Plan
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function CustomPlansScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<PlanStatus | "ALL">("ALL");
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<CustomPlan | null>(null);

  const fetchPlans = useCallback(
    async (filter: PlanStatus | "ALL", pg: number, reset = false) => {
      if (loading && !reset) return;
      setLoading(true);
      try {
        const { data } = await api.get("/api/admin/custom-plans", {
          params: {
            ...(filter !== "ALL" ? { status: filter } : {}),
            page: pg,
            limit: 20,
          },
        });
        const incoming: CustomPlan[] = data.data?.items ?? [];
        setPlans((prev) => (reset ? incoming : [...prev, ...incoming]));
        setHasMore(data.data?.hasMore ?? false);
        setPage(pg);
      } catch (err) {
        console.error("Failed to fetch custom plans", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchPlans(activeFilter, 1, true);
  }, [activeFilter]);

  const handleUpdate = (updatedPlan: Partial<CustomPlan>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === selected?.id ? { ...p, ...updatedPlan } : p)),
    );
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Status filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View className="flex-row items-center gap-2">
            {STATUS_FILTERS.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setActiveFilter(value)}
                className={`px-3.5 py-1.5 rounded-full border-[0.5px] ${
                  activeFilter === value
                    ? "bg-brand-primary border-brand-primary"
                    : "bg-brand-bg border-brand-border"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    activeFilter === value ? "text-white" : "text-gray-700"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => (
          <PlanCard
            plan={item}
            index={index}
            onPress={() => setSelected(item)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        onEndReached={() => {
          if (!loading && hasMore) fetchPlans(activeFilter, page + 1);
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPlans(activeFilter, 1, true);
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#1B4F8A" className="mt-10" />
          ) : (
            <Text className="text-center text-gray-400 mt-10">
              No custom plans yet
            </Text>
          )
        }
        ListFooterComponent={
          loading && plans.length > 0 ? (
            <ActivityIndicator color="#1B4F8A" className="my-4" />
          ) : null
        }
      />

      {selected && (
        <PlanDetailModal
          plan={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </View>
  );
}
