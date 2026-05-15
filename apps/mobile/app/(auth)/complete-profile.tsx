import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
} from "react-native-reanimated";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";
import * as ImagePicker from "expo-image-picker";

const ID_TYPES = [
  { label: "Aadhaar Card", value: "AADHAAR", sides: ["front", "back"] },
  { label: "PAN Card", value: "PAN", sides: ["front"] },
  { label: "Passport", value: "PASSPORT", sides: ["front"] },
  { label: "Voter ID", value: "VOTER_ID", sides: ["front", "back"] },
  {
    label: "Driving Licence",
    value: "DRIVING_LICENCE",
    sides: ["front", "back"],
  },
];

export default function CompleteProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const completeProfile = useAuthStore((s) => s.completeProfile);
  const uploadIdProof = useAuthStore((s) => s.uploadIdProof);

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  useEffect(() => {
    // If name is already set and profile is complete, jump to step 2 automatically if ID is not verified
    if (user?.profileComplete && !user?.idVerified && !user?.idSubmittedAt) {
      setStep(2);
    }
  }, [user]);

  const handleStep1Submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await completeProfile(name.trim(), email.trim() || undefined);
      setStep(2);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (side: "front" | "back", useCamera = false) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (side === "front") setFrontImage(result.assets[0].uri);
      if (side === "back") setBackImage(result.assets[0].uri);
    }
  };

  const handleStep2Submit = async () => {
    if (!frontImage) return;
    if (idType.sides.includes("back") && !backImage) return;

    setLoading(true);
    try {
      await uploadIdProof(idType.value, frontImage, backImage || undefined);
      if (user?.role === "CUSTOMER") router.replace("/(customer)/ride");
      if (user?.role === "DRIVER") router.replace("/(driver)/home");
      if (user?.role === "ADMIN") router.replace("/(admin)/dashboard");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Upload failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const isStep2Valid = () => {
    if (!frontImage) return false;
    if (idType.sides.includes("back") && !backImage) return false;
    return true;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2F7]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-10 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <Animated.View
              key="step1"
              exiting={FadeOutLeft}
              className="flex-1 justify-between"
            >
              <Animated.View entering={FadeInDown.delay(80).springify()}>
                <Text className="text-[#1B4F8A] font-bold text-3xl mb-2">
                  Complete your profile
                </Text>
                <Text className="text-[#9CA3AF] text-sm mb-8">
                  Just a couple more details to get you started
                </Text>

                <View className="gap-5">
                  <View className="gap-2">
                    <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                      Full Name
                    </Text>
                    <View className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-[#111827] font-medium text-base"
                        placeholder="Rahul Kumar"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                      Email Address{" "}
                      <Text className="text-[#9CA3AF] normal-case">
                        (optional)
                      </Text>
                    </Text>
                    <View className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-[#111827] font-medium text-base"
                        placeholder="rahul@example.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(240).springify()}
                className="mt-8"
              >
                <Button
                  label="Continue →"
                  onPress={handleStep1Submit}
                  loading={loading}
                  disabled={!name.trim()}
                />
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View
              key="step2"
              entering={FadeInRight}
              className="flex-1 justify-between"
            >
              <View>
                <Text className="text-[#1B4F8A] font-bold text-3xl mb-2">
                  Verify your identity
                </Text>
                <Text className="text-[#9CA3AF] text-sm mb-8">
                  Required to book trips. Your data is safe with us.
                </Text>

                <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase mb-2">
                  Select ID Type
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {ID_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => {
                        setIdType(type);
                        setFrontImage(null);
                        setBackImage(null);
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        idType.value === type.value
                          ? "bg-[#1B4F8A] border-[#1B4F8A]"
                          : "bg-white border-[#DDE3ED]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          idType.value === type.value
                            ? "text-white"
                            : "text-[#111827]"
                        }`}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {idType.sides.map((side) => {
                  const imageUri = side === "front" ? frontImage : backImage;
                  return (
                    <View key={side} className="mb-6">
                      <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase mb-2">
                        {side === "front"
                          ? `Front of ${idType.label}`
                          : `Back of ${idType.label}`}
                      </Text>

                      {imageUri ? (
                        <View className="relative w-full h-40 bg-white border border-[#DDE3ED] rounded-xl overflow-hidden">
                          <Image
                            source={{ uri: imageUri }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() =>
                              side === "front"
                                ? setFrontImage(null)
                                : setBackImage(null)
                            }
                            className="absolute top-2 right-2 bg-black/50 w-8 h-8 rounded-full items-center justify-center"
                          >
                            <Text className="text-white font-bold">✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="w-full h-40 bg-white border border-dashed border-[#DDE3ED] rounded-xl items-center justify-center gap-3">
                          <Text className="text-3xl">📷</Text>
                          <View className="flex-row gap-3">
                            <TouchableOpacity
                              onPress={() =>
                                pickImage(side as "front" | "back", true)
                              }
                              className="bg-[#EEF2F7] px-4 py-2 rounded-lg"
                            >
                              <Text className="text-[#1B4F8A] font-medium text-sm">
                                Take Photo
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                pickImage(side as "front" | "back", false)
                              }
                              className="bg-[#EEF2F7] px-4 py-2 rounded-lg"
                            >
                              <Text className="text-[#1B4F8A] font-medium text-sm">
                                Choose from Gallery
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <View className="mt-8">
                <Button
                  label="Submit & Continue"
                  onPress={handleStep2Submit}
                  loading={loading}
                  disabled={!isStep2Valid()}
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
