import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  rides: number;
  joined: string;
  status: "active" | "banned";
};

type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  plate: string;
  rating: number;
  trips: number;
  kyc: "verified" | "pending" | "rejected";
  online: boolean;
  status: "active" | "banned";
};

const CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Priya Sharma",
    email: "priya@gmail.com",
    phone: "+91 98100 11111",
    rides: 42,
    joined: "Jan 2024",
    status: "active",
  },
  {
    id: "c2",
    name: "Arjun Mehta",
    email: "arjun@gmail.com",
    phone: "+91 98100 22222",
    rides: 18,
    joined: "Mar 2024",
    status: "active",
  },
  {
    id: "c3",
    name: "Sneha Kapoor",
    email: "sneha@gmail.com",
    phone: "+91 98100 33333",
    rides: 7,
    joined: "Apr 2024",
    status: "banned",
  },
  {
    id: "c4",
    name: "Rahul Verma",
    email: "rahul@gmail.com",
    phone: "+91 98100 44444",
    rides: 93,
    joined: "Nov 2023",
    status: "active",
  },
  {
    id: "c5",
    name: "Meera Patel",
    email: "meera@gmail.com",
    phone: "+91 98100 55555",
    rides: 3,
    joined: "Today",
    status: "active",
  },
];

const DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Ravi Kumar",
    email: "ravi@gmail.com",
    phone: "+91 98100 66666",
    vehicle: "Swift Dzire",
    plate: "DL 01 CA 1234",
    rating: 4.9,
    trips: 142,
    kyc: "verified",
    online: true,
    status: "active",
  },
  {
    id: "d2",
    name: "Suresh Singh",
    email: "suresh@gmail.com",
    phone: "+91 98100 77777",
    vehicle: "Honda City",
    plate: "DL 04 CB 5678",
    rating: 4.7,
    trips: 89,
    kyc: "verified",
    online: false,
    status: "active",
  },
  {
    id: "d3",
    name: "Arun Verma",
    email: "arun@gmail.com",
    phone: "+91 98100 88888",
    vehicle: "Innova",
    plate: "DL 08 CC 9012",
    rating: 0,
    trips: 0,
    kyc: "rejected",
    online: false,
    status: "active",
  },
  {
    id: "d4",
    name: "Deepak Yadav",
    email: "deepak@gmail.com",
    phone: "+91 98100 99999",
    vehicle: "Nexon EV",
    plate: "DL 12 CD 3456",
    rating: 0,
    trips: 0,
    kyc: "pending",
    online: false,
    status: "active",
  },
  {
    id: "d5",
    name: "Manish Gupta",
    email: "manish@gmail.com",
    phone: "+91 98100 00000",
    vehicle: "Fortuner",
    plate: "DL 02 CE 7890",
    rating: 4.8,
    trips: 210,
    kyc: "verified",
    online: true,
    status: "banned",
  },
];

const KYC_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: "#EAF3DE", text: "#3B6D11", label: "Verified" },
  pending: { bg: "#FAEEDA", text: "#854F0B", label: "Pending" },
  rejected: { bg: "#FCEBEB", text: "#A32D2D", label: "Rejected" },
};

const STATUS_BADGE = {
  active: { bg: "#EAF3DE", text: "#3B6D11" },
  banned: { bg: "#FCEBEB", text: "#A32D2D" },
};

export default function UsersScreen() {
  const [tab, setTab] = useState<"customers" | "drivers">("customers");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | Driver | null>(null);
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [drivers, setDrivers] = useState(DRIVERS);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleCustomerBan = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "active" ? "banned" : "active" }
          : c,
      ),
    );
    setSelected(null);
  };

  const toggleDriverBan = (id: string) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === "active" ? "banned" : "active" }
          : d,
      ),
    );
    setSelected(null);
  };

  const isDriver = (u: Customer | Driver): u is Driver => "kyc" in u;

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
                {t} ({t === "customers" ? customers.length : drivers.length})
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
        </View>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {tab === "customers" &&
          filteredCustomers.map((c, i) => (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(i * 40).springify()}
            >
              <TouchableOpacity
                onPress={() => setSelected(c)}
                activeOpacity={0.8}
                className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
              >
                <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
                  <Text className="text-white font-bold text-sm">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-sm">
                    {c.name}
                  </Text>
                  <Text className="text-brand-sub text-xs mt-0.5">
                    {c.email}
                  </Text>
                  <Text className="text-brand-sub text-xs">
                    {c.rides} rides · Joined {c.joined}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: STATUS_BADGE[c.status].bg,
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: STATUS_BADGE[c.status].text,
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {c.status}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

        {tab === "drivers" &&
          filteredDrivers.map((d, i) => (
            <Animated.View
              key={d.id}
              entering={FadeInDown.delay(i * 40).springify()}
            >
              <TouchableOpacity
                onPress={() => setSelected(d)}
                activeOpacity={0.8}
                className="flex-row items-center gap-3 px-5 py-4 border-b border-brand-border"
              >
                <View className="relative">
                  <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
                    <Text className="text-white font-bold text-sm">
                      {d.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </Text>
                  </View>
                  {d.online && (
                    <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-sm">
                    {d.name}
                  </Text>
                  <Text className="text-brand-sub text-xs mt-0.5">
                    {d.vehicle} · {d.plate}
                  </Text>
                  <Text className="text-brand-sub text-xs">
                    {d.trips > 0
                      ? `★ ${d.rating} · ${d.trips} trips`
                      : "No trips yet"}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <View
                    style={{
                      backgroundColor: KYC_BADGE[d.kyc].bg,
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: KYC_BADGE[d.kyc].text,
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {KYC_BADGE[d.kyc].label}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: STATUS_BADGE[d.status].bg,
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: STATUS_BADGE[d.status].text,
                        fontSize: 10,
                        fontWeight: "700",
                        textTransform: "capitalize",
                      }}
                    >
                      {d.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        <View className="h-6" />
      </ScrollView>

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
                  {selected.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </Text>
              </View>
              <View>
                <Text
                  style={{ color: "#111827", fontWeight: "700", fontSize: 17 }}
                >
                  {selected.name}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                  {selected.email}
                </Text>
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
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Vehicle
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {selected.vehicle} · {selected.plate}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Rating</Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    ★ {selected.rating} · {selected.trips} trips
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    KYC Status
                  </Text>
                  <Text
                    style={{
                      color: KYC_BADGE[selected.kyc].text,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {KYC_BADGE[selected.kyc].label}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Online now
                  </Text>
                  <Text
                    style={{
                      color: selected.online ? "#16a34a" : "#9CA3AF",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {selected.online ? "Yes" : "No"}
                  </Text>
                </View>
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
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Total rides
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {(selected as Customer).rides}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Member since
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {(selected as Customer).joined}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Status</Text>
                  <Text
                    style={{
                      color: STATUS_BADGE[selected.status].text,
                      fontWeight: "700",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {selected.status}
                  </Text>
                </View>
              </View>
            )}

            {/* Ban / Unban */}
            <TouchableOpacity
              onPress={() =>
                isDriver(selected)
                  ? toggleDriverBan(selected.id)
                  : toggleCustomerBan(selected.id)
              }
              activeOpacity={0.9}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor:
                  selected.status === "active" ? "#FCEBEB" : "#EAF3DE",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: selected.status === "active" ? "#A32D2D" : "#3B6D11",
                }}
              >
                {selected.status === "active"
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
