import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "../../utils/api";
import Animated, { FadeInDown } from "react-native-reanimated";
import Button from "../../components/ui/Button";

const SEGMENTS = ["HATCHBACK", "SEDAN", "MINI_SUV", "SUV", "TEMPO"];

export default function VehicleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [existingVehicle, setExistingVehicle] = useState<any>(null);
  const [form, setForm] = useState({
    make: "",
    model: "",
    color: "",
    year: "",
    plateNumber: "",
    registrationNumber: "",
    segment: "HATCHBACK",
    maxCapacity: "",
  });

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await api.get("/api/driver/vehicle");
      if (res.data.data) {
        setExistingVehicle(res.data.data);
        const v = res.data.data;
        setForm({
          make: v.make || "",
          model: v.model || "",
          color: v.color || "",
          year: v.year ? String(v.year) : "",
          plateNumber: v.plateNumber || "",
          registrationNumber: v.registrationNumber || "",
          segment: v.segment || "HATCHBACK",
          maxCapacity: v.maxCapacity ? String(v.maxCapacity) : "",
        });
      } else {
        setIsEditing(true);
      }
    } catch (err) {
      setIsEditing(true);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (
        !form.make ||
        !form.model ||
        !form.plateNumber ||
        !form.registrationNumber ||
        !form.year ||
        !form.maxCapacity ||
        !form.color
      ) {
        Alert.alert("Missing Fields", "Please fill in all vehicle details");
        return;
      }

      setLoading(true);
      await api.post("/api/driver/vehicle", {
        ...form,
        year: parseInt(form.year),
        maxCapacity: parseInt(form.maxCapacity),
      });

      Alert.alert("Success", "Vehicle details updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setIsEditing(false);
            fetchVehicle();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          err.message ||
          "Failed to update vehicle",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#EEF2F7] items-center justify-center"
        edges={["top"]}
      >
        <ActivityIndicator size="large" color="#1B4F8A" />
      </SafeAreaView>
    );
  }

  if (existingVehicle && !isEditing) {
    return (
      <SafeAreaView className="flex-1 bg-[#EEF2F7]" edges={["top"]}>
        <ScrollView contentContainerClassName="flex-grow px-6 pt-6 pb-10">
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Text className="text-[#1B4F8A] font-bold text-3xl mb-2">
              My Vehicle
            </Text>
            <Text className="text-[#9CA3AF] text-sm mb-6">
              Details of your currently registered vehicle
            </Text>

            <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#DDE3ED] mb-6">
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Make & Model
                  </Text>
                  <Text className="text-[#111827] font-bold text-lg">
                    {existingVehicle.make} {existingVehicle.model}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Year
                  </Text>
                  <Text className="text-[#111827] font-bold text-lg">
                    {existingVehicle.year}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Plate Number
                  </Text>
                  <Text className="text-[#1B4F8A] font-bold text-base bg-blue-50 px-2 py-1 rounded">
                    {existingVehicle.plateNumber}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Color
                  </Text>
                  <Text className="text-[#111827] font-bold text-base">
                    {existingVehicle.color}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View>
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Segment
                  </Text>
                  <Text className="text-[#111827] font-bold text-base">
                    {existingVehicle.segment}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#9CA3AF] text-xs font-semibold mb-1 uppercase tracking-wider">
                    Capacity
                  </Text>
                  <Text className="text-[#111827] font-bold text-base">
                    {existingVehicle.maxCapacity} Pax
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="bg-white border border-[#1B4F8A] rounded-xl p-4 items-center"
            >
              <Text className="text-[#1B4F8A] font-bold text-sm">
                Register New Car
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2F7]" edges={["top"]}>
      <ScrollView contentContainerClassName="flex-grow px-6 pt-6 pb-10">
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[#1B4F8A] font-bold text-3xl">
              {existingVehicle ? "Update Vehicle" : "Vehicle Registration"}
            </Text>
            {existingVehicle && (
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text className="text-red-500 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-[#9CA3AF] text-sm mb-6">
            Enter your vehicle details to start accepting rides
          </Text>

          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Make (e.g. Maruti, Tata)
              </Text>
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                placeholder="Enter Make"
                value={form.make}
                onChangeText={(val) => setForm({ ...form, make: val })}
              />
            </View>

            <View className="gap-2">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Model (e.g. Swift, Nexon)
              </Text>
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                placeholder="Enter Model"
                value={form.model}
                onChangeText={(val) => setForm({ ...form, model: val })}
              />
            </View>

            <View className="flex-row gap-4">
              <View className="gap-2 flex-1">
                <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                  Color
                </Text>
                <TextInput
                  className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                  placeholder="White"
                  value={form.color}
                  onChangeText={(val) => setForm({ ...form, color: val })}
                />
              </View>
              <View className="gap-2 flex-1">
                <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                  Year
                </Text>
                <TextInput
                  className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                  placeholder="2022"
                  keyboardType="numeric"
                  value={form.year}
                  onChangeText={(val) => setForm({ ...form, year: val })}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Plate Number
              </Text>
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                placeholder="MH 12 AB 1234"
                autoCapitalize="characters"
                value={form.plateNumber}
                onChangeText={(val) => setForm({ ...form, plateNumber: val })}
              />
            </View>

            <View className="gap-2">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Registration Number (RC)
              </Text>
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                placeholder="RC Number"
                autoCapitalize="characters"
                value={form.registrationNumber}
                onChangeText={(val) =>
                  setForm({ ...form, registrationNumber: val })
                }
              />
            </View>

            <View className="gap-2 flex-1">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Max Passenger Capacity
              </Text>
              <TextInput
                className="bg-white border border-[#DDE3ED] rounded-xl px-4 h-14 text-[#111827]"
                placeholder="4"
                keyboardType="numeric"
                value={form.maxCapacity}
                onChangeText={(val) => setForm({ ...form, maxCapacity: val })}
              />
            </View>

            <View className="gap-2">
              <Text className="text-[#111827] font-semibold text-xs tracking-widest uppercase">
                Vehicle Segment
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SEGMENTS.map((seg) => (
                  <TouchableOpacity
                    key={seg}
                    onPress={() => setForm({ ...form, segment: seg })}
                    className={`px-4 py-2 rounded-full border ${
                      form.segment === seg
                        ? "bg-[#1B4F8A] border-[#1B4F8A]"
                        : "bg-white border-[#DDE3ED]"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        form.segment === seg ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      {seg.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
        <View className="mt-8">
          <Button
            label="Save Vehicle"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
