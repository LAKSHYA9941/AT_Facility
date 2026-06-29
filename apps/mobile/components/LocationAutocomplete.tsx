import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { searchPlaces, GeoapifyPlace } from "../utils/geoapify";
import { useCurrentLocation } from "../hooks/useCurrentLocation";

interface Props {
  label: string;
  placeholder?: string;
  value: GeoapifyPlace | null;
  onSelect: (place: GeoapifyPlace) => void;
  onClear: () => void;
  biasCoords?: { lat: number; lon: number } | null;
  showCurrentLocationButton?: boolean; // true on pickup only
  currentLocationState?: ReturnType<typeof useCurrentLocation>;
  testID?: string;
}

export default function LocationAutocomplete({
  label,
  placeholder = "Search location...",
  value,
  onSelect,
  onClear,
  biasCoords,
  showCurrentLocationButton = false,
  currentLocationState,
  testID,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoapifyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger search immediately
  const triggerSearch = useCallback(
    async (text: string): Promise<void> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (text.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchPlaces(
          text,
          biasCoords?.lat,
          biasCoords?.lon,
        );
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [biasCoords],
  );

  // Debounced search
  const handleQueryChange = useCallback(
    (text: string): void => {
      setQuery(text);
      if (value) {
        onClear();
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (text.trim().length >= 2) {
        setLoading(true);
        debounceTimerRef.current = setTimeout(() => {
          triggerSearch(text);
        }, 800);
      } else {
        setSuggestions([]);
        setLoading(false);
      }
    },
    [value, onClear, triggerSearch],
  );

  // Keyboard submit
  const handleSubmitEditing = useCallback((): void => {
    triggerSearch(query);
  }, [query, triggerSearch]);

  // Handle auto-select when location resolves
  useEffect(() => {
    if (
      showCurrentLocationButton &&
      currentLocationState?.status === "granted" &&
      currentLocationState?.address
    ) {
      onSelect(currentLocationState.address);
    }
  }, [
    showCurrentLocationButton,
    currentLocationState?.status,
    currentLocationState?.address,
    onSelect,
  ]);

  // Handle cleanups
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelectItem = useCallback(
    (item: GeoapifyPlace): void => {
      onSelect(item);
      setQuery(item.label);
      setSuggestions([]);
      setFocused(false);
    },
    [onSelect],
  );

  const handleInputFocus = useCallback((): void => {
    setFocused(true);
    // Removed auto-trigger on focus to save API calls. User must type.
  }, []);

  const handleInputBlur = useCallback((): void => {
    // Delay blur slightly to allow option click to register
    setTimeout(() => {
      setFocused(false);
    }, 200);
  }, []);

  const handleClear = useCallback((): void => {
    onClear();
    setQuery("");
    setSuggestions([]);
  }, [onClear]);

  // Render item without inline function
  const renderItem = useCallback(
    (item: GeoapifyPlace) => {
      return (
        <TouchableOpacity
          key={item.placeId}
          onPress={() => handleSelectItem(item)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.label}`}
          className="px-4 py-3.5 border-b border-gray-100 active:bg-[#F8FAFC]"
        >
          <Text
            className="text-sm font-semibold text-[#1E293B] mb-0.5"
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {item.state ? (
            <Text className="text-xs text-[#64748B]" numberOfLines={1}>
              {item.state}, {item.country}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [handleSelectItem],
  );

  // Use current location component
  const renderLocationButton = (): React.JSX.Element | null => {
    if (!showCurrentLocationButton || !currentLocationState) return null;

    const { status, errorMessage, request } = currentLocationState;

    return (
      <TouchableOpacity
        onPress={request}
        disabled={status === "requesting"}
        className="flex-row items-center mr-2 py-1 pr-2 border-r border-[#DDE3ED]"
        accessibilityRole="button"
        accessibilityLabel="Use current location"
      >
        {status === "requesting" ? (
          <View className="mr-1">
            <ActivityIndicator size="small" color="#1B4F8A" />
          </View>
        ) : (
          <Text className="text-[#1B4F8A] font-bold text-base mr-1">◎</Text>
        )}

        {status === "idle" && (
          <Text className="text-[#1B4F8A] text-xs font-semibold">
            Use my location
          </Text>
        )}
        {status === "denied" && (
          <Text className="text-[#9CA3AF] text-xs">Denied</Text>
        )}
        {status === "requesting" && (
          <Text className="text-[#9CA3AF] text-xs font-medium">
            Locating...
          </Text>
        )}
        {status === "granted" && (
          <Text className="text-gray-500 text-xs font-medium">
            {currentLocationState.address?.city ?? "Found"}
          </Text>
        )}
        {status === "error" && (
          <View className="flex-row items-center">
            <Text
              className="text-red-500 text-xs mr-1"
              style={{ fontSize: 13 }}
            >
              GPS signal weak.
            </Text>
            <Text
              className="text-[#1B4F8A] text-xs font-bold underline"
              style={{ fontSize: 13 }}
            >
              Retry
            </Text>
          </View>
        )}
        {status === "unavailable" && (
          <Text className="text-[#9CA3AF] text-xs">Unavailable</Text>
        )}
      </TouchableOpacity>
    );
  };

  const showSuggestionsList = focused && query.trim().length >= 2;

  return (
    <View className="mb-4">
      <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">
        {label}
      </Text>

      <View
        className="flex-row items-center bg-[#EEF2F7] rounded-xl border border-[#DDE3ED] px-3 py-1"
        testID={testID}
      >
        {renderLocationButton()}

        <TextInput
          className="flex-1 text-sm text-[#111827] py-2"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value ? value.label : query}
          onChangeText={handleQueryChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          returnKeyType="search"
          onSubmitEditing={handleSubmitEditing}
          accessibilityLabel={`${label} input`}
          style={{ includeFontPadding: false }}
        />

        {value || query ? (
          <TouchableOpacity onPress={handleClear} className="p-1">
            <Text className="text-[#9CA3AF] font-bold text-sm">✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showSuggestionsList ? (
        <View
          className="bg-white border border-[#DDE3ED] rounded-xl overflow-hidden mt-2"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {loading && suggestions.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator
                size="small"
                color="#1B4F8A"
                accessibilityLabel="Searching locations"
              />
            </View>
          ) : (
            <View>
              {suggestions.length > 0 ? (
                suggestions.map((item) => renderItem(item))
              ) : query.trim().length >= 2 ? (
                <View className="px-4 py-4">
                  <Text className="text-sm text-[#9CA3AF] text-center">
                    No results found for '{query}'
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
