import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

type DocStatus = "pending" | "approved" | "rejected";

type Doc = {
  id: string;
  label: string;
  emoji: string;
  status: DocStatus;
  rejectReason?: string;
};

type KYCDriver = {
  id: string;
  name: string;
  vehicle: string;
  submitted: string;
  docs: Doc[];
  overallStatus: "pending" | "approved" | "rejected";
};

const INITIAL_QUEUE: KYCDriver[] = [
  {
    id: "d1",
    name: "Deepak Yadav",
    vehicle: "Tata Nexon EV · DL 12 CD 3456",
    submitted: "2 hours ago",
    overallStatus: "pending",
    docs: [
      { id: "aadhaar", label: "Aadhaar Card", emoji: "🪪", status: "pending" },
      { id: "dl", label: "Driving License", emoji: "🚗", status: "pending" },
      { id: "rc", label: "Vehicle RC", emoji: "📄", status: "pending" },
      { id: "pan", label: "PAN Card", emoji: "💳", status: "pending" },
      {
        id: "police",
        label: "Police Verification",
        emoji: "🛡️",
        status: "pending",
      },
      { id: "selfie", label: "Live Selfie", emoji: "🤳", status: "pending" },
    ],
  },
  {
    id: "d2",
    name: "Kavita Nair",
    vehicle: "Honda City · DL 05 AB 7890",
    submitted: "5 hours ago",
    overallStatus: "pending",
    docs: [
      { id: "aadhaar", label: "Aadhaar Card", emoji: "🪪", status: "pending" },
      { id: "dl", label: "Driving License", emoji: "🚗", status: "pending" },
      { id: "rc", label: "Vehicle RC", emoji: "📄", status: "pending" },
      { id: "pan", label: "PAN Card", emoji: "💳", status: "pending" },
      {
        id: "police",
        label: "Police Verification",
        emoji: "🛡️",
        status: "pending",
      },
      { id: "selfie", label: "Live Selfie", emoji: "🤳", status: "pending" },
    ],
  },
  {
    id: "d3",
    name: "Rohit Mishra",
    vehicle: "Maruti Ertiga · DL 07 GH 2345",
    submitted: "Yesterday",
    overallStatus: "pending",
    docs: [
      { id: "aadhaar", label: "Aadhaar Card", emoji: "🪪", status: "pending" },
      { id: "dl", label: "Driving License", emoji: "🚗", status: "pending" },
      { id: "rc", label: "Vehicle RC", emoji: "📄", status: "pending" },
      { id: "pan", label: "PAN Card", emoji: "💳", status: "pending" },
      {
        id: "police",
        label: "Police Verification",
        emoji: "🛡️",
        status: "pending",
      },
      { id: "selfie", label: "Live Selfie", emoji: "🤳", status: "pending" },
    ],
  },
];

const DOC_STATUS_STYLE: Record<
  DocStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#EEF2F7", text: "#9CA3AF", label: "Pending" },
  approved: { bg: "#EAF3DE", text: "#3B6D11", label: "Approved ✓" },
  rejected: { bg: "#FCEBEB", text: "#A32D2D", label: "Rejected" },
};

export default function VerifyScreen() {
  const [queue, setQueue] = useState<KYCDriver[]>(INITIAL_QUEUE);
  const [selected, setSelected] = useState<KYCDriver | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    driverId: string;
    docId: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveDoc = (driverId: string, docId: string) => {
    setQueue((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? {
              ...d,
              docs: d.docs.map((doc) =>
                doc.id === docId ? { ...doc, status: "approved" } : doc,
              ),
            }
          : d,
      ),
    );
    setSelected((prev) =>
      prev?.id === driverId
        ? {
            ...prev,
            docs: prev.docs.map((doc) =>
              doc.id === docId ? { ...doc, status: "approved" } : doc,
            ),
          }
        : prev,
    );
  };

  const rejectDoc = (driverId: string, docId: string, reason: string) => {
    setQueue((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? {
              ...d,
              docs: d.docs.map((doc) =>
                doc.id === docId
                  ? { ...doc, status: "rejected", rejectReason: reason }
                  : doc,
              ),
            }
          : d,
      ),
    );
    setSelected((prev) =>
      prev?.id === driverId
        ? {
            ...prev,
            docs: prev.docs.map((doc) =>
              doc.id === docId
                ? { ...doc, status: "rejected", rejectReason: reason }
                : doc,
            ),
          }
        : prev,
    );
    setRejectModal(null);
    setRejectReason("");
  };

  const approveDriver = (driverId: string) => {
    setQueue((prev) => prev.filter((d) => d.id !== driverId));
    setSelected(null);
    Alert.alert(
      "Driver Approved",
      "Driver can now accept rides on At Facility.",
    );
  };

  const rejectDriver = (driverId: string) => {
    setQueue((prev) => prev.filter((d) => d.id !== driverId));
    setSelected(null);
    Alert.alert(
      "Driver Rejected",
      "Driver has been notified to re-submit documents.",
    );
  };

  const allApproved = (driver: KYCDriver) =>
    driver.docs.every((d) => d.status === "approved");
  const anyRejected = (driver: KYCDriver) =>
    driver.docs.some((d) => d.status === "rejected");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-brand-border">
        <Text className="text-brand-text font-bold text-xl">
          KYC Verification
        </Text>
        <Text className="text-brand-sub text-sm mt-1">
          {queue.length} driver{queue.length !== 1 ? "s" : ""} pending review
        </Text>
      </View>

      {/* Queue */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {queue.length === 0 && (
          <View className="flex-1 items-center justify-center py-24">
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
            <Text className="text-brand-text font-bold text-lg">
              All clear!
            </Text>
            <Text className="text-brand-sub text-sm mt-1">
              No pending verifications
            </Text>
          </View>
        )}

        {queue.map((driver, i) => {
          const approvedCount = driver.docs.filter(
            (d) => d.status === "approved",
          ).length;
          const progress = approvedCount / driver.docs.length;

          return (
            <Animated.View
              key={driver.id}
              entering={FadeInDown.delay(i * 60).springify()}
              className="mx-5 mt-4 border border-brand-border rounded-2xl overflow-hidden"
            >
              {/* Driver info */}
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
                    {driver.vehicle}
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

              {/* Progress bar */}
              <View className="px-4 py-2 border-b border-brand-border">
                <View className="h-2 bg-brand-input rounded-full overflow-hidden">
                  <View
                    style={{
                      height: "100%",
                      width: `${progress * 100}%`,
                      backgroundColor: progress === 1 ? "#16a34a" : "#1B4F8A",
                      borderRadius: 999,
                    }}
                  />
                </View>
              </View>

              {/* Review button */}
              <TouchableOpacity
                onPress={() => setSelected(driver)}
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
      </ScrollView>

      {/* Doc review sheet */}
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
                    {selected.name
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
                    {selected.name}
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    {selected.vehicle}
                  </Text>
                </View>
              </View>

              {/* Docs */}
              {selected.docs.map((doc) => {
                const s = DOC_STATUS_STYLE[doc.status];
                return (
                  <View
                    key={doc.id}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        doc.status === "approved"
                          ? "#C0DD97"
                          : doc.status === "rejected"
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
                        marginBottom: doc.status === "rejected" ? 8 : 0,
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

                    {doc.status === "pending" && (
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            setRejectModal({
                              driverId: selected.id,
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
                          onPress={() => approveDoc(selected.id, doc.id)}
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
                {allApproved(selected) && (
                  <TouchableOpacity
                    onPress={() => approveDriver(selected.id)}
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
                {anyRejected(selected) && (
                  <TouchableOpacity
                    onPress={() => rejectDriver(selected.id)}
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
                {!allApproved(selected) && !anyRejected(selected) && (
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

      {/* Reject reason modal */}
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
    </SafeAreaView>
  );
}
