import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/Auth";
import { homeHref } from "@/lib/roles";
import { colors } from "@/lib/theme";

export default function OfficeLayout() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/" />;
  if (user.role !== "ADMIN" && user.role !== "STAFF") return <Redirect href={homeHref(user.role)} />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { color: colors.green, fontWeight: "700" },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: user.tenantName ?? "Office", tabBarLabel: "Home" }} />
      <Tabs.Screen name="enrollment" options={{ title: "Enrollment", tabBarLabel: "Enroll" }} />
      <Tabs.Screen name="students" options={{ title: "Students", tabBarLabel: "Kids" }} />
      <Tabs.Screen name="tuition" options={{ title: "Tuition", tabBarLabel: "Tuition" }} />
    </Tabs>
  );
}
