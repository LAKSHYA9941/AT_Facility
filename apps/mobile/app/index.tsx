import { Redirect } from "expo-router";
import { useAuthStore } from "../store/auth";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return null; // initialize() handles routing
  return <Redirect href="/(onboarding)/welcome" />;
}
