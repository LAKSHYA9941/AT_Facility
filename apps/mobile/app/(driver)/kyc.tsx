import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
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
  documentNumber?: string;
  placeholder?: string;
};

const INITIAL_DOCS: Doc[] = [
  {
    id: "AADHAAR",
    label: "Aadhaar Card",
    sub: "Front & back photo",
    emoji: "🪪",
    status: "empty",
    placeholder: "Enter Adhaar number",
  },
  {
    id: "DRIVING_LICENSE",
    label: "Driving License",
    sub: "Valid DL — all vehicle classes",
    emoji: "🚗",
    status: "empty",
    placeholder: "Enter Driving License number",
  },
  {
    id: "VEHICLE_RC",
    label: "Vehicle RC",
    sub: "Registration certificate",
    emoji: "📄",
    status: "empty",
    placeholder: "Enter Vehicle RC number",
  },
  {
    id: "PAN",
    label: "PAN Card",
    sub: "For payment & tax purposes",
    emoji: "💳",
    status: "empty",
    placeholder: "Enter PAN number",
  },
  {
    id: "SELFIE",
    label: "Live Selfie",
    sub: "Face must match Aadhaar photo",
    emoji: "🤳",
    status: "empty",
    placeholder: "Take a selfie with your face clearly visible",
  },
  {
    id: "BANK_DETAILS",
    label: "Bank Passbook / Cancelled Cheque",
    sub: "For receiving payments",
    emoji: "🏦",
    status: "empty",
    placeholder: "Enter Account number",
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

  // Additional flat fields
  const [name, setName] = useState("");
  const [bankIFSC, setBankIFSC] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const res = await api.get("/api/kyc/status");
      const profile = res.data.data;
      setOverallStatus(profile.kycStatus || "UNSUBMITTED");

      setName(profile.name || "");
      setBankIFSC(profile.bankIFSC || "");
      setBankAccountName(profile.bankAccountName || "");

      setDocs((prev) =>
        prev.map((doc) => {
          let isUploaded = false;
          let docNumber = "";

          if (doc.id === "AADHAAR" && profile.aadhaarUrl) {
            isUploaded = true;
            docNumber = profile.aadhaarNumber || "";
          } else if (doc.id === "DRIVING_LICENSE" && profile.dlUrl) {
            isUploaded = true;
            docNumber = profile.dlNumber || "";
          } else if (doc.id === "VEHICLE_RC" && profile.rcUrl) {
            isUploaded = true;
            docNumber = profile.rcNumber || "";
          } else if (doc.id === "PAN" && profile.panUrl) {
            isUploaded = true;
            docNumber = profile.panNumber || "";
          } else if (doc.id === "BANK_DETAILS" && profile.bankDetailsUrl) {
            isUploaded = true;
            docNumber = profile.bankAccountNumber || "";
          } else if (doc.id === "SELFIE" && profile.selfieUrl) {
            isUploaded = true;
          }

          if (isUploaded) {
            let s: DocStatus = "uploaded";
            if (profile.kycStatus === "VERIFIED") s = "verified";
            if (profile.kycStatus === "REJECTED") s = "rejected";
            return {
              ...doc,
              status: s,
              documentNumber: docNumber,
            };
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

  const handleUpload = (id: string) => {
    Alert.alert("Upload Document", "Choose an option", [
      {
        text: "Camera",
        onPress: () => pickImage(id, true),
      },
      {
        text: "Gallery",
        onPress: () => pickImage(id, false),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = async (id: string, useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5, // Compresses image to fasten up upload
      };

      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permission required",
            "Camera permission is required to take a photo.",
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled) return;
      const asset = result.assets[0];

      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, uploading: true } : d)),
      );

      // 1. Get presigned URL — backend route: POST /api/kyc/upload/:docType
      const currentDoc = docs.find((d) => d.id === id);
      const queryParam = currentDoc?.documentNumber
        ? `?documentNumber=${encodeURIComponent(currentDoc.documentNumber)}`
        : "";
      const { data } = await api.get(`/api/kyc/upload/${id}${queryParam}`);
      const presignedUrl = data.data.presignedUrl;

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
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    if (!bankIFSC.trim() || !bankAccountName.trim()) {
      Alert.alert("Required", "Please complete all Bank Details fields.");
      return;
    }

    try {
      await api.post("/api/kyc/submit", {
        name: name.trim(),
        bankIFSC: bankIFSC.trim(),
        bankAccountName: bankAccountName.trim(),
        aadhaarNumber:
          docs.find((d) => d.id === "AADHAAR")?.documentNumber || undefined,
        dlNumber:
          docs.find((d) => d.id === "DRIVING_LICENSE")?.documentNumber ||
          undefined,
        rcNumber:
          docs.find((d) => d.id === "VEHICLE_RC")?.documentNumber || undefined,
        panNumber:
          docs.find((d) => d.id === "PAN")?.documentNumber || undefined,
      });
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
          {allUploaded && overallStatus !== "VERIFIED" && (
            <Text className="text-green-600 font-semibold text-xs mt-2">
              ✓ All documents uploaded — tap Submit below
            </Text>
          )}
          {overallStatus === "VERIFIED" && (
            <Text className="text-green-600 font-semibold text-xs mt-2">
              ✓ Documents Verified. You can now accept jobs.
            </Text>
          )}
        </Animated.View>

        {overallStatus !== "VERIFIED" && (
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="mx-5 mb-4 p-4 border border-[#DDE3ED] rounded-2xl bg-gray-50"
          >
            <Text className="text-brand-text font-bold text-sm mb-3">
              Basic Details
            </Text>

            <View className="gap-3">
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 py-3 text-sm"
                placeholder="Full Name (as per ID)"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 py-3 text-sm"
                placeholder="Bank Account Name"
                placeholderTextColor="#9CA3AF"
                value={bankAccountName}
                onChangeText={setBankAccountName}
              />
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 py-3 text-sm"
                placeholder="Bank IFSC Code"
                placeholderTextColor="#9CA3AF"
                value={bankIFSC}
                onChangeText={setBankIFSC}
                autoCapitalize="characters"
              />
            </View>
          </Animated.View>
        )}

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
                  <TouchableOpacity
                    onPress={() =>
                      overallStatus !== "VERIFIED" && handleUpload(doc.id)
                    }
                    disabled={overallStatus === "VERIFIED" || doc.uploading}
                    activeOpacity={overallStatus === "VERIFIED" ? 1 : 0.8}
                    className={`rounded-xl px-3 py-2 ${overallStatus !== "VERIFIED" && doc.status === "uploaded" ? "bg-brand-primary" : cfg.bg}`}
                  >
                    {doc.uploading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text
                        className={`font-bold text-xs ${overallStatus !== "VERIFIED" && doc.status === "uploaded" ? "text-white" : cfg.text}`}
                      >
                        {overallStatus !== "VERIFIED" &&
                        doc.status === "uploaded"
                          ? "Re-upload"
                          : cfg.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {doc.status === "empty" ||
              doc.status === "rejected" ||
              (doc.status === "uploaded" && overallStatus !== "VERIFIED") ? (
                doc.id !== "SELFIE" ? (
                  <View className="mt-4 gap-3">
                    <TextInput
                      className="bg-white border border-[#DDE3ED] rounded-xl px-4 py-3 text-sm"
                      placeholder={doc.placeholder || "Enter Document Number"}
                      placeholderTextColor="#9CA3AF"
                      value={doc.documentNumber || ""}
                      onChangeText={(val) =>
                        setDocs((prev) =>
                          prev.map((d) =>
                            d.id === doc.id ? { ...d, documentNumber: val } : d,
                          ),
                        )
                      }
                    />
                  </View>
                ) : null
              ) : null}
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
              overallStatus === "VERIFIED" ||
              overallStatus === "PENDING"
            }
            activeOpacity={0.9}
            className="rounded-2xl py-4 items-center"
            style={{
              backgroundColor:
                allUploaded &&
                overallStatus !== "VERIFIED" &&
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
                  overallStatus !== "VERIFIED" &&
                  overallStatus !== "PENDING"
                    ? "#fff"
                    : "#9CA3AF",
              }}
            >
              {overallStatus === "PENDING"
                ? "Verification Pending"
                : overallStatus === "VERIFIED"
                  ? "Verified"
                  : "Submit for Verification"}
            </Text>
          </TouchableOpacity>
          <Text className="text-brand-sub text-xs text-center mt-2">
            Verification usually takes 24–48 hours after submission
          </Text>
        </Animated.View>

        {/* Personal Info Section */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="mx-5 mb-4"
        >
          <Text className="text-brand-text font-bold text-sm mb-2 ml-1">
            Personal Info
          </Text>
          <TextInput
            className="bg-white border border-[#DDE3ED] rounded-xl px-4 py-3 text-sm text-brand-text"
            placeholder="Full Name (as per ID)"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            editable={
              overallStatus !== "VERIFIED" && overallStatus !== "PENDING"
            }
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
