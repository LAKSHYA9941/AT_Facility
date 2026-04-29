import type { Href } from "expo-router";
import { Redirect } from "expo-router";

export default function Index() {
  // Later: check auth store and redirect accordingly
  return <Redirect href={"/(auth)/login" as Href} />;
}
