import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

const TODAY_STATS = [
  { val: "6",      label: "Trips" },
  { val: "₹1,840", label: "Earned" },
  { val: "4.9★",  label: "Rating" },
  { val: "5.2hr", label: "Online" },
];

const MOCK_REQUEST = {
  passenger: "Priya Sharma",
  rating: 4.8,
  pickup: "Connaught Place, New Delhi",
  drop: "Indira Gandhi Airport T3",
  distance: "22.4 km",
  fare: "₹520",
  segment: "Shaana Babu",
};

export default function DriverHome() {
  const [online, setOnline] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const toggleOnline = () => {
    const next = !online;
    setOnline(next);
    if (next) {
      setTimeout(() => {
        setShowRequest(true);
        let c = 15;
        const interval = setInterval(() => {
          c -= 1;
          setCountdown(c);
          if (c <= 0) {
            clearInterval(interval);
            setShowRequest(false);
            setCountdown(15);
          }
        }, 1000);
      }, 2000);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Map — root level, full screen */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        customMapStyle={mapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        zoomTapEnabled
        moveOnMarkerPress={false}
      />

      {/* Overlay — box-none so map gets gestures in empty space */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="box-none"
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={["top"]}
          pointerEvents="box-none"
        >
          {/* Topbar */}
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}
            pointerEvents="box-none"
          >
            <View style={{ backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 15 }}>At Facility</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Driver Mode</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Online toggle */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <TouchableOpacity
              onPress={toggleOnline}
              activeOpacity={0.9}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: online ? "#16a34a" : "#1B4F8A",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
                {online ? "🟢  You're Online — Tap to go Offline" : "⚫  You're Offline — Tap to go Online"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats card */}
          <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 16 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 10, fontWeight: "600", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Today</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TODAY_STATS.map(s => (
                  <View key={s.label} style={{ flex: 1, backgroundColor: "#EEF2F7", borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
                    <Text style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 13 }}>{s.val}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Offline prompt */}
          {!online && (
            <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🚗</Text>
                <Text style={{ color: "#111827", fontWeight: "700", fontSize: 15, textAlign: "center" }}>Go online to start earning</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, textAlign: "center", marginTop: 4 }}>Tap the button above when you're ready</Text>
              </View>
            </View>
          )}

          {/* Spacer — box-none so map gets touches here */}
          <View style={{ flex: 1 }} pointerEvents="box-none" />

          {/* Incoming ride request sheet */}
          {showRequest && (
            <Animated.View
              entering={FadeInUp.springify()}
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 32,
              }}
            >
              <View style={{ width: 40, height: 4, backgroundColor: "#DDE3ED", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View>
                  <Text style={{ color: "#9CA3AF", fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>New Ride Request</Text>
                  <Text style={{ color: "#111827", fontWeight: "700", fontSize: 18 }}>{MOCK_REQUEST.segment}</Text>
                </View>
                <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: "#1B4F8A", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 18 }}>{countdown}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, backgroundColor: "#EEF2F7", borderRadius: 16, padding: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1B4F8A", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>PS</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#111827", fontWeight: "700", fontSize: 14 }}>{MOCK_REQUEST.passenger}</Text>
                  <Text style={{ color: "#F59E0B", fontSize: 12 }}>★ {MOCK_REQUEST.rating}</Text>
                </View>
                <Text style={{ color: "#1B4F8A", fontWeight: "700", fontSize: 16 }}>{MOCK_REQUEST.fare}</Text>
              </View>

              <View style={{ backgroundColor: "#EEF2F7", borderRadius: 16, padding: 12, marginBottom: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#1B4F8A" }} />
                  <Text style={{ color: "#111827", fontSize: 13, flex: 1 }} numberOfLines={1}>{MOCK_REQUEST.pickup}</Text>
                </View>
                <View style={{ width: 1, height: 14, backgroundColor: "#DDE3ED", marginLeft: 4 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#1B4F8A" }} />
                  <Text style={{ color: "#111827", fontSize: 13, flex: 1 }} numberOfLines={1}>{MOCK_REQUEST.drop}</Text>
                </View>
              </View>

              <Text style={{ color: "#9CA3AF", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
                {MOCK_REQUEST.distance} · Est. fare {MOCK_REQUEST.fare}
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => { setShowRequest(false); setCountdown(15); }}
                  activeOpacity={0.8}
                  style={{ flex: 1, borderWidth: 2, borderColor: "#DDE3ED", borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "#9CA3AF", fontWeight: "700", fontSize: 15 }}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowRequest(false); setCountdown(15); }}
                  activeOpacity={0.8}
                  style={{ flex: 1, backgroundColor: "#1B4F8A", borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>Accept</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#e8edf5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1B4F8A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#dde3ed" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c8d8e4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];