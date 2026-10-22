import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ChildPicker } from "@/components/ChildPicker";
import { Card, Copy, Row, StatusText, Title } from "@/components/Ui";
import { useFamily } from "@/context/Family";
import { api } from "@/lib/api";
import { childName, classPlaceLabel } from "@/lib/family";
import { colors } from "@/lib/theme";

type Progress = {
  juz: number | null;
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  date: string;
  status?: string | null;
};

export default function ProgressScreen() {
  const { children, child, childId, selectChild } = useFamily();
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    if (!childId) {
      setProgress([]);
      return;
    }
    api<{ progress: Progress[] }>(`/api/progress?studentId=${encodeURIComponent(childId)}`)
      .then((data) => setProgress(data.progress))
      .catch(() => setProgress([]));
  }, [childId]);

  const latest = progress[0];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Child Progress</Title>
        <Copy>This is the same Juz, Surah, and ayah the teacher recorded.</Copy>
        <ChildPicker children={children} childId={childId} onSelect={selectChild} />
        {!child ? <Copy>Select a child from the list.</Copy> : null}
        {child && !latest ? (
          <Copy>
            {child.status === "waiting_assessment" || child.status === "pending"
              ? `${child.firstName} is waiting for assessment.`
              : `No Quran progress for ${child.firstName} yet.`}
          </Copy>
        ) : null}
        {child && latest ? (
          <>
            <Copy>{`${childName(child)} · ${classPlaceLabel(child)}`}</Copy>
            <StatusText status={latest.status ?? "on_track"} label={latest.status?.replace("_", " ") ?? "on track"} />
            <Row title={`Juz ${latest.juz ?? "—"}`} meta={`${latest.surah}${latest.ayahFrom ? ` · Ayah ${latest.ayahFrom}${latest.ayahTo ? `–${latest.ayahTo}` : ""}` : ""}`} />
            <Copy>{`Teacher recorded ${latest.date}`}</Copy>
            {progress.slice(1, 8).map((item) => (
              <Row
                key={`${item.date}-${item.surah}-${item.juz}`}
                title={`${item.date} · Juz ${item.juz ?? "—"}`}
                meta={item.surah}
              />
            ))}
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
