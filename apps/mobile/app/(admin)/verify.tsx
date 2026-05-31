import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
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

// ── Types ──────────────────────────────────────────────

type DocStatus = "PENDING" | "APPROVED" | "REJECTED";

type Doc = {
  id: string;
  type: string;
  label: string;
  emoji: string;
  status: DocStatus;
  rejectReason?: string;
  fileUrl?: string;
};

type KYCDriver = {
  id: string;
  name: string;
  phone: string;
  submitted: string;
  docs: Doc[];
  overallStatus: string;
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

const DOC_STATUS_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "#EEF2F7", text: "#9CA3AF", label: "Pending" },
  APPROVED: { bg: "#EAF3DE", text: "#3B6D11", label: "Approved ✓" },
  REJECTED: { bg: "#FCEBEB", text: "#A32D2D", label: "Rejected" },
};

const DOC_META: Record<string, { label: string; emoji: string }> = {
  AADHAAR: { label: "Aadhaar Card", emoji: "🪪" },
  DRIVING_LICENSE: { label: "Driving License", emoji: "🚗" },
  VEHICLE_RC: { label: "Vehicle RC", emoji: "📄" },
  PAN: { label: "PAN Card", emoji: "💳" },
  BANK_DETAILS: { label: "Bank Details", emoji: "🏦" },
  SELFIE: { label: "Live Selfie", emoji: "🤳" },
};

const ID_TYPE_META: Record<string, { label: string; emoji: string }> = {
  AADHAAR: { label: "Aadhaar Card", emoji: "🪪" },
  PAN: { label: "PAN Card", emoji: "💳" },
  PASSPORT: { label: "Passport", emoji: "🛂" },
  VOTER_ID: { label: "Voter ID", emoji: "🗳️" },
  DRIVING_LICENCE: { label: "Driving Licence", emoji: "🚗" },
};

export default function VerifyScreen() {
  const [tab, setTab] = useState<"kyc" | "ids">("kyc");

  // KYC state
  const [kycLoading, setKycLoading] = useState(true);
  const [kycQueue, setKycQueue] = useState<KYCDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<KYCDriver | null>(null);

  // Customer ID state
  const [idsLoading, setIdsLoading] = useState(true);
  const [idsQueue, setIdsQueue] = useState<CustomerIdProof[]>([]);

  // Modals
  const [rejectModal, setRejectModal] = useState<{
    driverId: string;
    docId: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customerRejectModal, setCustomerRejectModal] = useState<string | null>(
    null,
  );
  const [customerRejectReason, setCustomerRejectReason] = useState("");

  // Document viewer
  const [docViewer, setDocViewer] = useState<{
    visible: boolean;
    docId?: string;
    userId?: string;
    side?: "front" | "back";
    directUrl?: string;
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
        docs: (d.documents || []).map((doc: any) => ({
          id: doc.id,
          type: doc.type,
          label: DOC_META[doc.type]?.label || doc.type,
          emoji: DOC_META[doc.type]?.emoji || "📄",
          status: doc.status || "PENDING",
          rejectReason: doc.rejectReason,
          fileUrl: doc.fileUrl,
        })),
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

  const approveDoc = async (driverId: string, docId: string) => {
    try {
      await api.put(`/api/admin/kyc/${driverId}/docs/${docId}/approve`);
      const update = (docs: Doc[]) =>
        docs.map((doc) =>
          doc.id === docId ? { ...doc, status: "APPROVED" as DocStatus } : doc,
        );
      setKycQueue((prev) =>
        prev.map((d) =>
          d.id === driverId ? { ...d, docs: update(d.docs) } : d,
        ),
      );
      setSelectedDriver((prev) =>
        prev?.id === driverId ? { ...prev, docs: update(prev.docs) } : prev,
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to approve",
      );
    }
  };

  const rejectDoc = async (driverId: string, docId: string, reason: string) => {
    try {
      await api.put(`/api/admin/kyc/${driverId}/docs/${docId}/reject`, {
        rejectReason: reason,
      });
      const update = (docs: Doc[]) =>
        docs.map((doc) =>
          doc.id === docId
            ? { ...doc, status: "REJECTED" as DocStatus, rejectReason: reason }
            : doc,
        );
      setKycQueue((prev) =>
        prev.map((d) =>
          d.id === driverId ? { ...d, docs: update(d.docs) } : d,
        ),
      );
      setSelectedDriver((prev) =>
        prev?.id === driverId ? { ...prev, docs: update(prev.docs) } : prev,
      );
      setRejectModal(null);
      setRejectReason("");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to reject");
    }
  };

  const approveDriver = async (driverId: string) => {
    try {
      await api.put(`/api/admin/kyc/${driverId}/approve`);
      setKycQueue((prev) => prev.filter((d) => d.id !== driverId));
      setSelectedDriver(null);
      Alert.alert("Driver Approved", "Driver can now accept rides.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to approve",
      );
    }
  };

  const rejectDriver = async (driverId: string) => {
    try {
      await api.put(`/api/admin/kyc/${driverId}/reject`);
      setKycQueue((prev) => prev.filter((d) => d.id !== driverId));
      setSelectedDriver(null);
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

  const allApproved = (driver: KYCDriver) =>
    driver.docs.length > 0 && driver.docs.every((d) => d.status === "APPROVED");
  const anyRejected = (driver: KYCDriver) =>
    driver.docs.some((d) => d.status === "REJECTED");

  const currentQueue = tab === "kyc" ? kycQueue : idsQueue;
  const currentLoading = tab === "kyc" ? kycLoading : idsLoading;

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
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
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
            kycQueue.map((driver, i) => {
              const approvedCount = driver.docs.filter(
                (d) => d.status === "APPROVED",
              ).length;
              const progress = driver.docs.length
                ? approvedCount / driver.docs.length
                : 0;

              return (
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
                    <View className="items-end">
                      <Text className="text-brand-primary font-bold text-sm">
                        {approvedCount}/{driver.docs.length}
                      </Text>
                      <Text className="text-brand-sub text-xs">docs OK</Text>
                    </View>
                  </View>
                  <View className="px-4 py-2 border-b border-brand-border">
                    <View className="h-2 bg-brand-input rounded-full overflow-hidden">
                      <View
                        style={{
                          height: "100%",
                          width: `${progress * 100}%`,
                          backgroundColor:
                            progress === 1 ? "#16a34a" : "#1B4F8A",
                          borderRadius: 999,
                        }}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDriver(driver)}
                    activeOpacity={0.85}
                    className="px-4 py-3.5 flex-row items-center justify-between"
                  >
                    <Text className="text-brand-primary font-bold text-sm">
                      Review documents
                    </Text>
                    <Text className="text-brand-primary text-base">›</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

          {/* ── Customer IDs Tab ─────────────────────── */}
          {tab === "ids" &&
            idsQueue.map((customer, i) => {
              const meta = ID_TYPE_META[customer.idProofType || ""] || {
                label: customer.idProofType || "ID Proof",
                emoji: "🪪",
              };
              return (
                <Animated.View
                  key={customer.id}
                  entering={FadeInDown.delay(i * 50).springify()}
                  className="mx-5 mt-4 border border-brand-border rounded-2xl overflow-hidden"
                >
                  {/* Header */}
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
                      <Text className="text-brand-sub text-xs">
                        {meta.emoji} {meta.label}
                      </Text>
                    </View>
                  </View>

                  {/* Document images */}
                  <View className="flex-row gap-3 px-4 py-3">
                    {/* Front */}
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
                        uri={customer.idProofFront}
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
                    {/* Back (if exists) */}
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
                          uri={customer.idProofBack}
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

                  {/* Actions */}
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
              {selectedDriver.docs.map((doc) => {
                const s =
                  DOC_STATUS_STYLE[doc.status] || DOC_STATUS_STYLE.PENDING;
                return (
                  <View
                    key={doc.id}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        doc.status === "APPROVED"
                          ? "#C0DD97"
                          : doc.status === "REJECTED"
                            ? "#F7C1C1"
                            : "#DDE3ED",
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
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
                        <Text style={{ fontSize: 20 }}>{doc.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "#111827",
                            fontWeight: "700",
                            fontSize: 13,
                          }}
                        >
                          {doc.label}
                        </Text>
                        {doc.rejectReason && (
                          <Text
                            style={{
                              color: "#A32D2D",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            Reason: {doc.rejectReason}
                          </Text>
                        )}
                        {doc.fileUrl && (
                          <TouchableOpacity
                            onPress={() =>
                              setDocViewer({
                                visible: true,
                                docId: doc.id,
                                directUrl: doc.fileUrl,
                                label: doc.label,
                              })
                            }
                          >
                            <Text
                              style={{
                                color: "#1B4F8A",
                                fontSize: 11,
                                marginTop: 2,
                                fontWeight: "600",
                              }}
                            >
                              View Document ↗
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View
                        style={{
                          backgroundColor: s.bg,
                          borderRadius: 20,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            color: s.text,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          {s.label}
                        </Text>
                      </View>
                    </View>

                    {/* Document thumbnail */}
                    {doc.fileUrl && doc.status === "PENDING" && (
                      <View style={{ marginTop: 10, marginBottom: 4 }}>
                        <LazyImage
                          uri={doc.fileUrl}
                          width={280}
                          height={120}
                          borderRadius={10}
                          containerStyle={{ width: "100%" }}
                          onPress={() =>
                            setDocViewer({
                              visible: true,
                              docId: doc.id,
                              directUrl: doc.fileUrl,
                              label: doc.label,
                            })
                          }
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    {doc.status === "PENDING" && (
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            setRejectModal({
                              driverId: selectedDriver.id,
                              docId: doc.id,
                            })
                          }
                          activeOpacity={0.8}
                          style={{
                            flex: 1,
                            backgroundColor: "#FCEBEB",
                            borderRadius: 12,
                            paddingVertical: 10,
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
                          onPress={() => approveDoc(selectedDriver.id, doc.id)}
                          activeOpacity={0.8}
                          style={{
                            flex: 1,
                            backgroundColor: "#EAF3DE",
                            borderRadius: 12,
                            paddingVertical: 10,
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
                    )}
                  </View>
                );
              })}

              {/* Final decision */}
              <View style={{ gap: 10, marginTop: 8 }}>
                {allApproved(selectedDriver) && (
                  <TouchableOpacity
                    onPress={() => approveDriver(selectedDriver.id)}
                    activeOpacity={0.9}
                    style={{
                      backgroundColor: "#1B4F8A",
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      ✅ Approve Driver
                    </Text>
                  </TouchableOpacity>
                )}
                {anyRejected(selectedDriver) && (
                  <TouchableOpacity
                    onPress={() => rejectDriver(selectedDriver.id)}
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
                      🚫 Reject Driver
                    </Text>
                  </TouchableOpacity>
                )}
                {!allApproved(selectedDriver) &&
                  !anyRejected(selectedDriver) && (
                    <View
                      style={{
                        backgroundColor: "#EEF2F7",
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#9CA3AF",
                          fontWeight: "700",
                          fontSize: 15,
                        }}
                      >
                        Review all docs to decide
                      </Text>
                    </View>
                  )}
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
              Reject document
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
                  rejectModal &&
                  rejectDoc(
                    rejectModal.driverId,
                    rejectModal.docId,
                    rejectReason,
                  )
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
        docId={docViewer.docId}
        docLabel={docViewer.label}
        directUrl={docViewer.directUrl}
        userId={docViewer.userId}
        side={docViewer.side}
      />
    </SafeAreaView>
  );
}
