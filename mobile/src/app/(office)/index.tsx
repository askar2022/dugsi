import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Kicker, Row, Title } from "@/components/Ui";
import { useAuth } from "@/context/Auth";
import { api } from "@/lib/api";
import { money } from "@/lib/family";
import { colors } from "@/lib/theme";

type Report = {
  students: number;
  enrolled: number;
  waiting?: number;
  pending: number;
  classes: number;
  tuition: { paid: number; due: number; late: number };
};

export default function OfficeHomeScreen() {
  const { user, logout } = useAuth();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports")
      .then((data) => setReport(data.report))
      .catch(() => setReport(null));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Kicker>Assalamu alaikum</Kicker>
        <Title>{user?.name ?? "Office"}</Title>
        <Copy>{user?.tenantName ?? "Your school"}</Copy>
      </Card>
      <Card>
        <Kicker>Today</Kicker>
        <Row title="Students" right={String(report?.students ?? "—")} />
        <Row title="Enrolled" right={String(report?.enrolled ?? "—")} />
        <Row title="Waiting assessment" right={String(report?.waiting ?? report?.pending ?? "—")} />
        <Row title="Classes" right={String(report?.classes ?? "—")} />
        <Row title="Tuition paid" right={report ? money(report.tuition.paid) : "—"} />
        <Row title="Tuition due" right={report ? money(report.tuition.due) : "—"} />
        <Row title="Tuition late" right={report ? money(report.tuition.late) : "—"} />
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
