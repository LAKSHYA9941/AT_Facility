import { Redirect } from "expo-router";
import { useAuthStore } from "../store/auth";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (user.role === "CUSTOMER") {
    return <Redirect href="/(customer)/plan-trip" />;
  }
  if (user.role === "DRIVER") {
    return <Redirect href="/(driver)/home" />;
  }
  if (user.role === "ADMIN") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}
