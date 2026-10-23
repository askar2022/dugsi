import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/Auth";
import { homeHref } from "@/lib/roles";
import { colors } from "@/lib/theme";

export default function TeacherLayout() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/" />;
  if (user.role !== "TEACHER") return <Redirect href={homeHref(user.role)} />;

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
      <Tabs.Screen name="index" options={{ title: user.tenantName ?? "Class", tabBarLabel: "Class" }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance", tabBarLabel: "Attend" }} />
      <Tabs.Screen name="progress" options={{ title: "Quran Progress", tabBarLabel: "Quran" }} />
      <Tabs.Screen name="homework" options={{ title: "Homework", tabBarLabel: "Work" }} />
    </Tabs>
  );
}
