import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ChildPicker } from "@/components/ChildPicker";
import { Button, Card, Copy, Row, Title } from "@/components/Ui";
import { useFamily } from "@/context/Family";
import { api } from "@/lib/api";
import { childClass } from "@/lib/family";
import { colors } from "@/lib/theme";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  studentId?: string | null;
  class?: { id: string; name: string } | { id: string; name: string }[] | null;
  completions?: Array<{ studentId: string; status: string }>;
};

function classIdOf(item: Homework) {
  const value = item.class;
  return (Array.isArray(value) ? value[0] : value)?.id ?? "";
}

export default function HomeworkScreen() {
  const { children, child, childId, selectChild } = useFamily();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await api<{ homework: Homework[] }>("/api/homework");
    setHomework(data.homework);
  }

  useEffect(() => {
    load().catch(() => setHomework([]));
  }, []);

  const classId = child ? childClass(child)?.id ?? child.classId ?? null : null;
  const waiting = !child || child.status === "waiting_assessment" || child.status === "pending" || !classId;
  const rows =
    classId && childId && !waiting
      ? homework.filter((item) => classIdOf(item) === classId && (!item.studentId || item.studentId === childId))
      : [];

  async function mark(id: string, status: "done" | "needs_help") {
    if (!childId) return;
    setBusy(`${id}:${status}`);
    try {
      await api(`/api/homework/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ studentId: childId, status }),
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Homework</Title>
        <Copy>Choose a child, then mark Done or Needs help.</Copy>
        <ChildPicker children={children} childId={childId} onSelect={selectChild} />
        {waiting ? <Copy>{child ? `${child.firstName} is waiting for a class.` : "Select a child."}</Copy> : null}
        {rows.map((item) => {
          const completion = item.completions?.find((row) => row.studentId === childId)?.status;
          return (
            <Card key={item.id}>
              <Row title={item.title} meta={item.dueDate ? `Due ${item.dueDate}` : item.description ?? ""} right={completion ?? ""} />
              <View style={styles.actions}>
                <Button label={busy === `${item.id}:done` ? "Saving..." : "Done"} onPress={() => mark(item.id, "done")} disabled={!!busy} />
                <Button
                  label={busy === `${item.id}:needs_help` ? "Saving..." : "Needs help"}
                  onPress={() => mark(item.id, "needs_help")}
                  disabled={!!busy}
                />
              </View>
            </Card>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
  actions: { gap: 8 },
});
