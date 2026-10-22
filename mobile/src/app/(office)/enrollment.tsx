import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Row, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Waiting = {
  id: string;
  firstName: string;
  lastName: string;
  parentName: string;
  status: string;
  className: string | null;
};

export default function OfficeEnrollmentScreen() {
  const [waiting, setWaiting] = useState<Waiting[]>([]);

  useEffect(() => {
    api<{ waiting: Waiting[] }>("/api/applications")
      .then((data) => setWaiting(data.waiting ?? []))
      .catch(() => setWaiting([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Enrollment</Title>
        <Copy>Children waiting for assessment. Place them in a class on the website.</Copy>
        {waiting.map((item) => (
          <Row
            key={item.id}
            title={`${item.firstName} ${item.lastName}`}
            meta={item.parentName}
            right={item.className ?? item.status.replace("_", " ")}
          />
        ))}
        {waiting.length === 0 ? <Copy>No children are waiting right now.</Copy> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
