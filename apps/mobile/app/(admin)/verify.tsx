import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../utils/api";
import LazyImage from "../../components/LazyImage";
import DocumentViewer from "../../components/DocumentViewer";
import {
  SkeletonDriverCard,
  SkeletonCard,
} from "../../components/SkeletonLoader";
import {
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Car,
  FileText,
  Camera,
  Landmark,
} from "lucide-react-native";

// ── Types ──────────────────────────────────────────────

type KYCDriver = {
  id: string;
  name: string;
  phone: string;
  submitted: string;
  overallStatus: string;
  aadhaarUrl?: string;
  aadhaarNumber?: string;
  dlUrl?: string;
  dlNumber?: string;
  rcUrl?: string;
  rcNumber?: string;
  panUrl?: string;
  panNumber?: string;
  bankDetailsUrl?: string;
  bankAccountNumber?: string;
  bankIFSC?: string;
  bankAccountName?: string;
  selfieUrl?: string;
};

type CustomerIdProof = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  idProofType: string | null;
  idProofFront: string | null;
  idProofBack: string | null;
  idSubmittedAt: string | null;
};

// ── Constants ──────────────────────────────────────────

const renderDocIcon = (docType: string, size = 16, color = "#1B4F8A") => {
  switch (docType) {
    case "AADHAAR":
    case "PAN":
    case "PASSPORT":
    case "VOTER_ID":
      return <CreditCard size={size} color={color} />;
    case "DRIVING_LICENCE":
    case "DRIVING_LICENSE":
      return <Car size={size} color={color} />;
    case "VEHICLE_RC":
      return <FileText size={size} color={color} />;
    case "BANK_DETAILS":
      return <Landmark size={size} color={color} />;
    case "SELFIE":
      return <Camera size={size} color={color} />;
    default:
      return <FileText size={size} color={color} />;
  }
};

const ID_TYPE_META: Record<string, { label: string }> = {
  AADHAAR: { label: "Aadhaar Card" },
  PAN: { label: "PAN Card" },
  PASSPORT: { label: "Passport" },
  VOTER_ID: { label: "Voter ID" },
  DRIVING_LICENCE: { label: "Driving Licence" },
};

export default function VerifyScreen() {
  const [tab, setTab] = useState<"kyc" | "ids">("kyc");

  // KYC state
  const [kycLoading, setKycLoading] = useState(true);
  const [kycQueue, setKycQueue] = useState<KYCDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<KYCDriver | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [approvingKyc, setApprovingKyc] = useState(false);

  // Customer ID state
  const [idsLoading, setIdsLoading] = useState(true);
  const [idsQueue, setIdsQueue] = useState<CustomerIdProof[]>([]);

  // Modals
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const [customerRejectModal, setCustomerRejectModal] = useState<string | null>(
    null,
  );
  const [customerRejectReason, setCustomerRejectReason] = useState("");

  // Document viewer
  const [docViewer, setDocViewer] = useState<{
    visible: boolean;
    userId?: string;
    side?: "front" | "back";
    directUrl?: string | null;
    label: string;
  }>({ visible: false, label: "" });

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch KYC Queue ──────────────────────────────────

  const fetchKycQueue = useCallback(async () => {
    try {
      setKycLoading(true);
      const res = await api.get("/api/admin/kyc/queue");
      const data = res.data.data;

      const mapped: KYCDriver[] = data.map((d: any) => ({
        id: d.id,
        name: d.user?.name || "Driver",
        phone: d.user?.phone || "",
        submitted: new Date(d.createdAt).toLocaleDateString("en-IN"),
        overallStatus: d.kycStatus || "PENDING",
      }));

      setKycQueue(mapped);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load KYC queue",
      );
    } finally {
      setKycLoading(false);
    }
  }, []);

  // ── Fetch Customer ID Queue ──────────────────────────

  const fetchIdsQueue = useCallback(async () => {
    try {
      setIdsLoading(true);
      const res = await api.get("/api/admin/id-proofs/queue");
      setIdsQueue(res.data.data || []);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load ID proof queue",
      );
    } finally {
      setIdsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKycQueue();
    fetchIdsQueue();
  }, [fetchKycQueue, fetchIdsQueue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchKycQueue(), fetchIdsQueue()]);
    setRefreshing(false);
  }, [fetchKycQueue, fetchIdsQueue]);

  // ── KYC Actions ──────────────────────────────────

  const loadDriverDetails = async (driver: KYCDriver) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/api/admin/kyc/${driver.id}`);
      setSelectedDriver({ ...driver, ...res.data.data });
    } catch (error: any) {
      Alert.alert("Error", "Failed to load driver details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const approveDriver = async (driverId: string) => {
    try {
      setApprovingKyc(true);
      await api.put(`/api/admin/kyc/${driverId}/approve`);
      setKycQueue((prev) => prev.filter((d) => d.id !== driverId));
      setSelectedDriver(null);
      Alert.alert("Driver Approved", "Driver can now accept rides.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to approve driver",
      );
    } finally {
      setApprovingKyc(false);
    }
  };

  const rejectDriver = async (driverId: string, reason: string) => {
    try {
      await api.put(`/api/admin/kyc/${driverId}/reject`, {
        rejectReason: reason,
      });
      setKycQueue((prev) => prev.filter((d) => d.id !== driverId));
      setSelectedDriver(null);
      setRejectModal(null);
      setRejectReason("");
      Alert.alert("Driver Rejected", "Driver has been notified.");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to reject");
    }
  };

  // ── Customer ID Actions ──────────────────────────

  const approveCustomerId = async (userId: string) => {
    try {
      await api.put(`/api/admin/id-proofs/${userId}/approve`);
      setIdsQueue((prev) => prev.filter((c) => c.id !== userId));
      Alert.alert("ID Approved", "Customer can now book trips.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to approve",
      );
    }
  };

  const rejectCustomerId = async (userId: string, reason: string) => {
    try {
      await api.put(`/api/admin/id-proofs/${userId}/reject`, { reason });
      setIdsQueue((prev) => prev.filter((c) => c.id !== userId));
      setCustomerRejectModal(null);
      setCustomerRejectReason("");
      Alert.alert("ID Rejected", "Customer has been notified.");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to reject");
    }
  };

  // ── Helpers ──────────────────────────────────

  const currentQueue = tab === "kyc" ? kycQueue : idsQueue;
  const currentLoading = tab === "kyc" ? kycLoading : idsLoading;

  const renderField = (
    label: string,
    docType: string,
    value: string | undefined,
    url: string | undefined,
  ) => {
    if (!url && !value) return null;
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: "#DDE3ED",
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "#EEF2F7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderDocIcon(docType, 20)}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#111827",
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {label}
            </Text>
            {value && (
              <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 2 }}>
                {value}
              </Text>
            )}
            {url && (
              <TouchableOpacity
                onPress={() =>
                  setDocViewer({
                    visible: true,
                    directUrl: url,
                    label,
                  })
                }
              >
                <Text
                  style={{
                    color: "#1B4F8A",
                    fontSize: 11,
                    marginTop: 4,
                    fontWeight: "600",
                  }}
                >
                  View Document ↗
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {url && (
          <View style={{ marginTop: 10, marginBottom: 4 }}>
            <LazyImage
              uri={url}
              width={280}
              height={120}
              borderRadius={10}
              containerStyle={{ width: "100%" }}
              onPress={() =>
                setDocViewer({
                  visible: true,
                  directUrl: url,
                  label,
                })
              }
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-brand-border">
        <Text className="text-brand-text font-bold text-xl">Verification</Text>
        <Text className="text-brand-sub text-sm mt-1">
          {kycQueue.length + idsQueue.length} total pending
        </Text>

        {/* Tab toggle */}
        <View className="flex-row bg-brand-input rounded-2xl p-1 mt-3">
          {(
            [
              { key: "kyc" as const, label: `Driver KYC (${kycQueue.length})` },
              {
                key: "ids" as const,
                label: `Customer IDs (${idsQueue.length})`,
              },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
              className="flex-1 py-2.5 rounded-xl items-center"
              style={{
                backgroundColor: tab === t.key ? "#1B4F8A" : "transparent",
              }}
            >
              <Text
                style={{
                  color: tab === t.key ? "#fff" : "#9CA3AF",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {currentLoading ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {tab === "kyc"
            ? [1, 2, 3].map((i) => <SkeletonDriverCard key={i} />)
            : [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </ScrollView>
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
          {currentQueue.length === 0 && (
            <View className="flex-1 items-center justify-center py-24">
              <CheckCircle
                size={48}
                color="#16a34a"
                style={{ marginBottom: 12 }}
              />
              <Text className="text-brand-text font-bold text-lg">
                All clear!
              </Text>
              <Text className="text-brand-sub text-sm mt-1">
                No pending {tab === "kyc" ? "KYC verifications" : "ID proofs"}
              </Text>
            </View>
          )}

          {/* ── KYC Tab ─────────────────────────────── */}
          {tab === "kyc" &&
            kycQueue.map((driver, i) => (
              <Animated.View
                key={driver.id}
                entering={FadeInDown.delay(i * 60).springify()}
                className="mx-5 mt-4 border border-brand-border rounded-2xl overflow-hidden"
              >
                <View className="flex-row items-center gap-3 px-4 py-4 border-b border-brand-border">
                  <View className="w-12 h-12 rounded-full bg-brand-primary items-center justify-center">
                    <Text className="text-white font-bold text-base">
                      {driver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-brand-text font-bold text-base">
                      {driver.name}
                    </Text>
                    <Text className="text-brand-sub text-xs mt-0.5">
                      {driver.phone}
                    </Text>
                    <Text className="text-brand-sub text-xs">
                      Submitted {driver.submitted}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => loadDriverDetails(driver)}
                  disabled={detailsLoading}
                  activeOpacity={0.85}
                  className="px-4 py-3.5 flex-row items-center justify-between"
                >
                  <Text className="text-brand-primary font-bold text-sm">
                    {detailsLoading ? "Loading..." : "Review documents"}
                  </Text>
                  <Text className="text-brand-primary text-base">›</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}

          {/* ── Customer IDs Tab ─────────────────────── */}
          {tab === "ids" &&
            idsQueue.map((customer, i) => {
              const meta = ID_TYPE_META[customer.idProofType || ""] || {
                label: customer.idProofType || "ID Proof",
              };
              return (
                <Animated.View
                  key={customer.id}
                  entering={FadeInDown.delay(i * 50).springify()}
                  className="mx-5 mt-4 border border-brand-border rounded-2xl overflow-hidden"
                >
                  <View className="flex-row items-center gap-3 px-4 py-4 border-b border-brand-border">
                    <View className="w-12 h-12 rounded-full bg-brand-primary items-center justify-center">
                      <Text className="text-white font-bold text-base">
                        {(customer.name || "??")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-brand-text font-bold text-base">
                        {customer.name || "Unnamed"}
                      </Text>
                      <Text className="text-brand-sub text-xs mt-0.5">
                        {customer.phone}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        {renderDocIcon(
                          customer.idProofType || "AADHAAR",
                          12,
                          "#9CA3AF",
                        )}
                        <Text className="text-brand-sub text-xs">
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-3 px-4 py-3">
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: "#9CA3AF",
                          fontSize: 10,
                          fontWeight: "600",
                          marginBottom: 6,
                        }}
                      >
                        FRONT
                      </Text>
                      <LazyImage
                        uri={customer.idProofFront || undefined}
                        width={150}
                        height={100}
                        borderRadius={12}
                        containerStyle={{ width: "100%" }}
                        onPress={() =>
                          setDocViewer({
                            visible: true,
                            userId: customer.id,
                            side: "front",
                            directUrl: customer.idProofFront,
                            label: `${meta.label} — Front`,
                          })
                        }
                      />
                    </View>
                    {customer.idProofBack && (
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "#9CA3AF",
                            fontSize: 10,
                            fontWeight: "600",
                            marginBottom: 6,
                          }}
                        >
                          BACK
                        </Text>
                        <LazyImage
                          uri={customer.idProofBack || undefined}
                          width={150}
                          height={100}
                          borderRadius={12}
                          containerStyle={{ width: "100%" }}
                          onPress={() =>
                            setDocViewer({
                              visible: true,
                              userId: customer.id,
                              side: "back",
                              directUrl: customer.idProofBack,
                              label: `${meta.label} — Back`,
                            })
                          }
                        />
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-2 px-4 pb-4">
                    <TouchableOpacity
                      onPress={() => setCustomerRejectModal(customer.id)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: "#FCEBEB",
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#A32D2D",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => approveCustomerId(customer.id)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: "#EAF3DE",
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#3B6D11",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Approve
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
        </ScrollView>
      )}

      {/* ── KYC Doc Review Sheet ─────────────────────── */}
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
              maxHeight: "85%",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#DDE3ED",
                borderRadius: 2,
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 4,
              }}
            />

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            >
              {/* Driver header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#1B4F8A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontWeight: "700", fontSize: 16 }}
                  >
                    {selectedDriver.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      color: "#111827",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {selectedDriver.name}
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    {selectedDriver.phone}
                  </Text>
                </View>
              </View>

              {/* Docs */}
              {renderField(
                "Aadhaar Card",
                "AADHAAR",
                selectedDriver.aadhaarNumber,
                selectedDriver.aadhaarUrl,
              )}
              {renderField(
                "Driving License",
                "DRIVING_LICENSE",
                selectedDriver.dlNumber,
                selectedDriver.dlUrl,
              )}
              {renderField(
                "Vehicle RC",
                "VEHICLE_RC",
                selectedDriver.rcNumber,
                selectedDriver.rcUrl,
              )}
              {renderField(
                "PAN Card",
                "PAN",
                selectedDriver.panNumber,
                selectedDriver.panUrl,
              )}
              {renderField(
                "Bank Details",
                "BANK_DETAILS",
                selectedDriver.bankDetailsUrl
                  ? `A/C: ${selectedDriver.bankAccountNumber || "N/A"}\nName: ${selectedDriver.bankAccountName || "N/A"}\nIFSC: ${selectedDriver.bankIFSC || "N/A"}`
                  : undefined,
                selectedDriver.bankDetailsUrl,
              )}
              {renderField(
                "Live Selfie",
                "SELFIE",
                undefined,
                selectedDriver.selfieUrl,
              )}

              {/* Final decision */}
              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => approveDriver(selectedDriver.id)}
                  disabled={approvingKyc}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: approvingKyc ? "#9CA3AF" : "#1B4F8A",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {approvingKyc ? <ActivityIndicator color="white" /> : null}
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    {approvingKyc ? "Approving..." : "Approve Driver"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRejectModal(selectedDriver.id)}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: "#FCEBEB",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#A32D2D",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    Reject Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── Driver Doc Reject Reason Modal ─────────── */}
      <Modal
        visible={!!rejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{ backgroundColor: "white", borderRadius: 24, padding: 24 }}
          >
            <Text
              style={{
                color: "#111827",
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 4,
              }}
            >
              Reject KYC
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 16 }}>
              Give a reason so the driver knows what to fix
            </Text>
            <TextInput
              style={{
                backgroundColor: "#EEF2F7",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: "#111827",
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
              placeholder="e.g. Photo is blurry, Aadhaar name mismatch..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#DDE3ED",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  rejectModal && rejectDriver(rejectModal, rejectReason)
                }
                disabled={!rejectReason.trim()}
                activeOpacity={0.9}
                style={{
                  flex: 1,
                  backgroundColor: rejectReason.trim() ? "#A32D2D" : "#EEF2F7",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: rejectReason.trim() ? "white" : "#9CA3AF",
                    fontWeight: "700",
                  }}
                >
                  Confirm Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Customer ID Reject Reason Modal ─────────── */}
      <Modal
        visible={!!customerRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomerRejectModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{ backgroundColor: "white", borderRadius: 24, padding: 24 }}
          >
            <Text
              style={{
                color: "#111827",
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 4,
              }}
            >
              Reject ID proof
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 16 }}>
              Give a reason so the customer knows what to fix
            </Text>
            <TextInput
              style={{
                backgroundColor: "#EEF2F7",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: "#111827",
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
              placeholder="e.g. Photo is blurry, document expired..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={customerRejectReason}
              onChangeText={setCustomerRejectReason}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setCustomerRejectModal(null);
                  setCustomerRejectReason("");
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#DDE3ED",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  customerRejectModal &&
                  rejectCustomerId(customerRejectModal, customerRejectReason)
                }
                disabled={!customerRejectReason.trim()}
                activeOpacity={0.9}
                style={{
                  flex: 1,
                  backgroundColor: customerRejectReason.trim()
                    ? "#A32D2D"
                    : "#EEF2F7",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: customerRejectReason.trim() ? "white" : "#9CA3AF",
                    fontWeight: "700",
                  }}
                >
                  Confirm Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Document Viewer ─────────────────────── */}
      <DocumentViewer
        visible={docViewer.visible}
        onClose={() => setDocViewer({ visible: false, label: "" })}
        docLabel={docViewer.label}
        directUrl={docViewer.directUrl}
        userId={docViewer.userId}
        side={docViewer.side}
      />
    </SafeAreaView>
  );
}
