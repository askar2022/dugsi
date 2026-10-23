import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Kicker, Row, Title } from "@/components/Ui";
import { useAuth } from "@/context/Auth";
import { useFamily } from "@/context/Family";
import { api } from "@/lib/api";
import { childClass } from "@/lib/family";
import { colors } from "@/lib/theme";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { children } = useFamily();
  const [welcomeNote, setWelcomeNote] = useState<string | null>(null);
  const [homeworkTitle, setHomeworkTitle] = useState<string | null>(null);
  const [attendanceText, setAttendanceText] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ tenant: { welcomeNote: string | null } }>("/api/settings"),
      api<{ homework: Array<{ title: string; dueDate: string | null }> }>("/api/homework"),
      api<{ attendance: Array<{ date: string; status: string; student?: { firstName: string } }> }>("/api/attendance"),
    ])
      .then(([settings, homework, attendance]) => {
        setWelcomeNote(settings.tenant.welcomeNote);
        const firstWork = homework.homework[0];
        setHomeworkTitle(
          firstWork ? `${firstWork.title}${firstWork.dueDate ? ` · due ${firstWork.dueDate}` : ""}` : null,
        );
        const firstMark = attendance.attendance[0];
        setAttendanceText(
          firstMark
            ? `${firstMark.student?.firstName ?? "Your child"} was marked ${firstMark.status} on ${firstMark.date}.`
            : null,
        );
      })
      .catch(() => undefined);
  }, []);

  const nextClass = children.map(childClass).find((item) => item?.dayOfWeek);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Kicker>Assalamu alaikum</Kicker>
        <Title>{user?.name ?? "Parent"}</Title>
        <Copy>{user?.tenantName ?? "Your dugsi"}</Copy>
      </Card>
      <Card>
        <Kicker>Updates</Kicker>
        {welcomeNote ? <Row title="From your school" meta={welcomeNote} /> : null}
        {nextClass ? (
          <Row
            title={`Class this ${nextClass.dayOfWeek}`}
            meta={[nextClass.name, nextClass.startTime && nextClass.endTime ? `${nextClass.startTime}–${nextClass.endTime}` : null]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}
        {homeworkTitle ? <Row title="Homework assigned" meta={homeworkTitle} /> : null}
        {attendanceText ? <Row title="Attendance" meta={attendanceText} /> : null}
        {!welcomeNote && !nextClass && !homeworkTitle && !attendanceText ? (
          <Copy>Class news, homework, and attendance will appear here after the next class.</Copy>
        ) : null}
      </Card>
      <Pressable onPress={logout}>
        <Copy>Sign out</Copy>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
