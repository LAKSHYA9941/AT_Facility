import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../utils/api";

type DocStatus = "empty" | "uploaded" | "verified" | "rejected";

type Doc = {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  status: DocStatus;
  rejectReason?: string;
  uploading?: boolean;
};

const INITIAL_DOCS: Doc[] = [
  {
    id: "AADHAAR",
    label: "Aadhaar Card",
    sub: "Front & back photo",
    emoji: "🪪",
    status: "empty",
  },
  {
    id: "DRIVING_LICENSE",
    label: "Driving License",
    sub: "Valid DL — all vehicle classes",
    emoji: "🚗",
    status: "empty",
  },
  {
    id: "VEHICLE_RC",
    label: "Vehicle RC",
    sub: "Registration certificate",
    emoji: "📄",
    status: "empty",
  },
  {
    id: "PAN",
    label: "PAN Card",
    sub: "For payment & tax purposes",
    emoji: "💳",
    status: "empty",
  },
  {
    id: "SELFIE",
    label: "Live Selfie",
    sub: "Face must match Aadhaar photo",
    emoji: "🤳",
    status: "empty",
  },
];

const STATUS_CONFIG = {
  empty: {
    bg: "bg-brand-input",
    text: "text-brand-sub",
    label: "Upload",
    border: "border-brand-border",
  },
  uploaded: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Uploaded",
    border: "border-blue-200",
  },
  verified: {
    bg: "bg-green-50",
    text: "text-green-700",
    label: "Verified ✓",
    border: "border-green-200",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-600",
    label: "Rejected",
    border: "border-red-200",
  },
};

export default function KYCScreen() {
  const [docs, setDocs] = useState<Doc[]>(INITIAL_DOCS);
  const [overallStatus, setOverallStatus] = useState<string>("UNSUBMITTED");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const res = await api.get("/api/kyc/status");
      const { status, documents } = res.data.data;
      setOverallStatus(status);

      setDocs((prev) =>
        prev.map((doc) => {
          const serverDoc = documents.find((d: any) => d.type === doc.id);
          if (serverDoc) {
            let s: DocStatus = "uploaded";
            if (serverDoc.status === "APPROVED") s = "verified";
            if (serverDoc.status === "REJECTED") s = "rejected";
            return { ...doc, status: s, rejectReason: serverDoc.rejectReason };
          }
          return doc;
        }),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadedCount = docs.filter(
    (d) => d.status === "uploaded" || d.status === "verified",
  ).length;
  const allUploaded = uploadedCount === docs.length;
  const progress = uploadedCount / docs.length;

  const handleUpload = async (id: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, uploading: true } : d)),
      );

      // 1. Get presigned URL
      const { data } = await api.get(`/api/kyc/presigned-url/${id}`);
      const presignedUrl = data.data.uploadUrl;

      // 2. Upload to S3
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await fetch(presignedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "image/jpeg" }, // Simplification
      });

      setDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: "uploaded", uploading: false } : d,
        ),
      );
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Failed to upload document");
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, uploading: false } : d)),
      );
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post("/api/kyc/submit");
      Alert.alert(
        "Docs Submitted!",
        "Our team will verify your documents within 24–48 hours. You'll be notified once approved.",
        [{ text: "Got it" }],
      );
      fetchKYCStatus();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Submission failed");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1B4F8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-5 pt-4 pb-2">
          <Text className="text-brand-text font-bold text-xl">
            Verification
          </Text>
          <Text className="text-brand-sub text-sm mt-1">
            Submit all documents to start accepting jobs
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          className="mx-5 mt-2 mb-4 bg-brand-input rounded-2xl px-5 py-4"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-brand-text font-bold text-sm">
              {uploadedCount} of {docs.length} submitted
            </Text>
            <Text className="text-brand-primary font-bold text-sm">
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View className="h-3 bg-white rounded-full overflow-hidden border border-brand-border">
            <View
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: allUploaded ? "#16a34a" : "#1B4F8A",
              }}
            />
          </View>
          {!allUploaded && (
            <Text className="text-brand-sub text-xs mt-2">
              ⚠️ You won't be able to accept jobs until all docs are submitted
              and verified
            </Text>
          )}
          {allUploaded && overallStatus !== "APPROVED" && (
            <Text className="text-green-600 font-semibold text-xs mt-2">
              ✓ All documents uploaded — tap Submit below
            </Text>
          )}
          {overallStatus === "APPROVED" && (
            <Text className="text-green-600 font-semibold text-xs mt-2">
              ✓ KYC Approved. You can now accept jobs.
            </Text>
          )}
        </Animated.View>

        {docs.map((doc, i) => {
          const cfg = STATUS_CONFIG[doc.status];
          return (
            <Animated.View
              key={doc.id}
              entering={FadeInDown.delay(120 + i * 50).springify()}
              className={`mx-5 mb-3 border rounded-2xl px-4 py-4 ${cfg.border}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-2xl bg-brand-input items-center justify-center">
                  <Text style={{ fontSize: 22 }}>{doc.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-brand-text font-bold text-sm">
                    {doc.label}
                  </Text>
                  <Text className="text-brand-sub text-xs mt-0.5">
                    {doc.sub}
                  </Text>
                  {doc.status === "rejected" && doc.rejectReason && (
                    <Text className="text-red-500 text-xs mt-1">
                      Reason: {doc.rejectReason}
                    </Text>
                  )}
                </View>
                {doc.status === "empty" || doc.status === "rejected" ? (
                  <TouchableOpacity
                    onPress={() => handleUpload(doc.id)}
                    disabled={doc.uploading}
                    activeOpacity={0.8}
                    className="bg-brand-primary rounded-xl px-3 py-2"
                  >
                    {doc.uploading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text className="text-white font-bold text-xs">
                        {doc.status === "rejected" ? "Re-upload" : "Upload"}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View className={`rounded-xl px-3 py-2 ${cfg.bg}`}>
                    <Text className={`font-bold text-xs ${cfg.text}`}>
                      {cfg.label}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          className="mx-5 mt-2"
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              !allUploaded ||
              overallStatus === "APPROVED" ||
              overallStatus === "PENDING"
            }
            activeOpacity={0.9}
            className="rounded-2xl py-4 items-center"
            style={{
              backgroundColor:
                allUploaded &&
                overallStatus !== "APPROVED" &&
                overallStatus !== "PENDING"
                  ? "#1B4F8A"
                  : "#DDE3ED",
            }}
          >
            <Text
              className="font-bold text-base"
              style={{
                color:
                  allUploaded &&
                  overallStatus !== "APPROVED" &&
                  overallStatus !== "PENDING"
                    ? "#fff"
                    : "#9CA3AF",
              }}
            >
              {overallStatus === "PENDING"
                ? "Verification Pending"
                : overallStatus === "APPROVED"
                  ? "Verified"
                  : "Submit for Verification"}
            </Text>
          </TouchableOpacity>
          <Text className="text-brand-sub text-xs text-center mt-2">
            Verification usually takes 24–48 hours after submission
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
