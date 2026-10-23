import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Row, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Homework = {
  id: string;
  title: string;
  dueDate: string | null;
  class?: { name?: string } | { name?: string }[] | null;
  completions?: Array<{ status: string; student?: { firstName?: string } }>;
};

function classNameOf(item: Homework) {
  const value = item.class;
  return (Array.isArray(value) ? value[0] : value)?.name ?? "Class";
}

export default function TeacherHomeworkScreen() {
  const [homework, setHomework] = useState<Homework[]>([]);

  useEffect(() => {
    api<{ homework: Homework[] }>("/api/homework")
      .then((data) => setHomework(data.homework))
      .catch(() => setHomework([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Homework</Title>
        <Copy>See assigned work and who marked Done or Needs help. Assign new work on the website.</Copy>
        {homework.map((item) => {
          const done = item.completions?.filter((row) => row.status === "done").length ?? 0;
          const help = item.completions?.filter((row) => row.status === "needs_help").length ?? 0;
          return (
            <Row
              key={item.id}
              title={item.title}
              meta={`${classNameOf(item)}${item.dueDate ? ` · due ${item.dueDate}` : ""}`}
              right={`${done} done · ${help} help`}
            />
          );
        })}
        {homework.length === 0 ? <Copy>No homework assigned yet.</Copy> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
