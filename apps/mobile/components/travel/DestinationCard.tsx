import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import type { Destination } from "../../data/destinations";

type Props = {
  destination: Destination;
  onPress: () => void;
};

// Card dimensions — used to request correctly-sized images from Cloudinary
const CARD_W = 208; // w-52 = 13rem = 208px
const CARD_H = 256; // h-64 = 16rem = 256px

/**
 * Append Cloudinary transforms to get a thumbnail-sized image.
 * Requests exactly 2× card size (for retina), auto-format, and auto-quality.
 */
function thumbnailUrl(url: string): string {
  // Insert transforms right after /upload/
  return url.replace(
    "/upload/",
    `/upload/c_fill,w_${CARD_W * 2},h_${CARD_H * 2},f_auto,q_auto/`,
  );
}

function DestinationCard({ destination, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 16,
        overflow: "hidden",
        marginRight: 12,
      }}
    >
      {/* Thumbnail — Cloudinary delivers a small, optimised version */}
      <Image
        source={{ uri: thumbnailUrl(destination.imageUrl) }}
        style={{ width: CARD_W, height: CARD_H }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={destination.slug}
      />

      {/* Subtle full-card tint */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.18)",
        }}
        pointerEvents="none"
      />

      {/* Strong gradient at the bottom for text readability */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 130,
          backgroundColor: "rgba(0,0,0,0.50)",
        }}
        pointerEvents="none"
      />

      {/* Duration badge — top right */}
      <View
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
          {destination.duration}
        </Text>
      </View>

      {/* Bottom content */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: 15,
            lineHeight: 18,
          }}
          numberOfLines={1}
        >
          {destination.name}
        </Text>
        <Text
          style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}
          numberOfLines={1}
        >
          {destination.tagline}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
          }}
        >
          <MapPin size={10} color="rgba(255,255,255,0.75)" />
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
            {destination.state}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Prevent re-renders when parent scrolls — slug is a stable key
export default React.memo(DestinationCard);
