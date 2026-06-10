import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { api } from "../utils/api";
import { X, AlertTriangle } from "lucide-react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type DocumentViewerProps = {
  visible: boolean;
  onClose: () => void;
  // For driver KYC docs
  docId?: string | null;
  docLabel?: string;
  // For customer ID proofs (direct URL)
  directUrl?: string | null;
  // For customer ID proofs via API
  userId?: string | null;
  side?: "front" | "back";
};

export default function DocumentViewer({
  visible,
  onClose,
  docId,
  docLabel = "Document",
  directUrl,
  userId,
  side = "front",
}: DocumentViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViewUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      if (directUrl) {
        // Use direct URL (public S3)
        setImageUrl(directUrl);
        setLoading(false);
        return;
      }

      if (docId) {
        // Driver KYC doc — get presigned URL
        const res = await api.get(`/api/admin/documents/${docId}/view-url`);
        setImageUrl(res.data.data.viewUrl);
      } else if (userId) {
        // Customer ID proof — get presigned URL
        const res = await api.get(
          `/api/admin/id-proofs/${userId}/view-url?side=${side}`,
        );
        setImageUrl(res.data.data.viewUrl);
      } else {
        setError("No document source provided");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load document",
      );
    } finally {
      setLoading(false);
    }
  }, [docId, directUrl, userId, side]);

  useEffect(() => {
    if (visible) {
      fetchViewUrl();
    } else {
      setImageUrl(null);
      setLoading(true);
      setError(null);
    }
  }, [visible, fetchViewUrl]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{docLabel}</Text>
            {side && userId && (
              <Text style={styles.headerSub}>
                {side === "front" ? "Front side" : "Back side"}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={styles.closeBtn}
          >
            <X size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading document…</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <AlertTriangle
                size={48}
                color="#f59e0b"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={fetchViewUrl}
                activeOpacity={0.8}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {imageUrl && !loading && !error && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bouncesZoom
              centerContent
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
                onError={() =>
                  setError("Failed to display image. It may have expired.")
                }
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 17,
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  errorContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_W - 32,
    height: SCREEN_H * 0.65,
  },
});
