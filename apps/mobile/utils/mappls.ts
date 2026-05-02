import MapplsGL from "mappls-map-react-native";

export const initMappls = () => {
  MapplsGL.setMapSDKKey(process.env.EXPO_PUBLIC_MAPPLS_MAP_SDK_KEY!);
  MapplsGL.setRestAPIKey(process.env.EXPO_PUBLIC_MAPPLS_REST_API_KEY!);
  MapplsGL.setAtlasClientId(process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID!);
  MapplsGL.setAtlasClientSecret(process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET!);
  MapplsGL.setAtlasGrantType("client_credentials");
};

export { MapplsGL };
