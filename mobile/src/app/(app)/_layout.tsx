import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/Auth";
import { FamilyProvider } from "@/context/Family";
import { homeHref } from "@/lib/roles";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/" />;
  if (user.role !== "PARENT") return <Redirect href={homeHref(user.role)} />;

  return (
    <FamilyProvider>
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
      <Tabs.Screen name="index" options={{ title: user.tenantName ?? "Parent", tabBarLabel: "Home" }} />
      <Tabs.Screen name="children" options={{ title: "Children", tabBarLabel: "Kids" }} />
      <Tabs.Screen name="tuition" options={{ title: "Tuition", tabBarLabel: "Tuition" }} />
      <Tabs.Screen name="homework" options={{ title: "Homework", tabBarLabel: "Work" }} />
      <Tabs.Screen name="progress" options={{ title: "Child Progress", tabBarLabel: "Quran" }} />
    </Tabs>
    </FamilyProvider>
  );
}
