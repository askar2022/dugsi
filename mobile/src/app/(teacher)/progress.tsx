import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Row, StatusText, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Student = { id: string; firstName: string; lastName: string };
type Progress = {
  studentId?: string;
  juz: number | null;
  surah: string;
  date: string;
  status?: string | null;
  student?: { id?: string } | { id?: string }[] | null;
};

function studentIdOf(item: Progress) {
  if (item.studentId) return item.studentId;
  const student = Array.isArray(item.student) ? item.student[0] : item.student;
  return student?.id ?? "";
}

export default function TeacherProgressScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ progress: Progress[] }>("/api/progress"),
    ])
      .then(([studentData, progressData]) => {
        setStudents(studentData.students);
        setProgress(progressData.progress);
      })
      .catch(() => undefined);
  }, []);

  const latest = useMemo(() => {
    const map = new Map<string, Progress>();
    for (const item of progress) {
      const id = studentIdOf(item);
      if (id && !map.has(id)) map.set(id, item);
    }
    return map;
  }, [progress]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Quran Progress</Title>
        <Copy>Latest place the teacher recorded. Add a new Juz on the website if needed.</Copy>
        {students.map((student) => {
          const item = latest.get(student.id);
          return (
            <Row
              key={student.id}
              title={`${student.firstName} ${student.lastName}`}
              meta={item ? `Juz ${item.juz ?? "—"} · ${item.surah} · ${item.date}` : "No record yet"}
              right={item?.status?.replace("_", " ") ?? ""}
            />
          );
        })}
        {students.length === 0 ? <Copy>No students in your class yet.</Copy> : null}
        {students[0] && latest.get(students[0].id) ? (
          <StatusText status={latest.get(students[0].id)?.status ?? "on_track"} label="Green on track. Yellow needs practice. Red contact parent." />
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
