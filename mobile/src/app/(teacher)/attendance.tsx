import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Copy, Row, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Student = { id: string; firstName: string; lastName: string; classId: string | null };
type SchoolClass = { id: string; name: string };
type Mark = "present" | "absent" | "late" | "excused";

const MARKS: Mark[] = ["present", "absent", "late", "excused"];

export default function TeacherAttendanceScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const date = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]).then(([studentData, classData]) => {
      setStudents(studentData.students);
      setClasses(classData.classes);
      setClassId((current) => current || classData.classes[0]?.id || "");
    }).catch(() => undefined);
  }, []);

  const roster = useMemo(
    () => students.filter((student) => !classId || student.classId === classId),
    [classId, students],
  );

  useEffect(() => {
    if (!classId) return;
    api<{ attendance: Array<{ studentId: string; status: string }> }>(
      `/api/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
    )
      .then((data) => {
        const next: Record<string, Mark> = {};
        for (const row of data.attendance) next[row.studentId] = row.status as Mark;
        setMarks(next);
      })
      .catch(() => setMarks({}));
  }, [classId, date]);

  async function save() {
    if (!classId) return;
    setPending(true);
    setMessage("");
    try {
      await api("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          classId,
          date,
          marks: roster.map((student) => ({
            studentId: student.id,
            status: marks[student.id] ?? "present",
          })),
        }),
      });
      setMessage("Attendance saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Attendance</Title>
        <Copy>{`Today ${date}. Tap Here, Out, Late, or Exc.`}</Copy>
        {classes.length > 1 ? (
          <View style={styles.chips}>
            {classes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setClassId(item.id)}
                style={[styles.chip, classId === item.id && styles.chipOn]}
              >
                <Text style={[styles.chipText, classId === item.id && styles.chipTextOn]}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {roster.map((student) => {
          const current = marks[student.id] ?? "present";
          return (
            <View key={student.id} style={styles.student}>
              <Row title={`${student.firstName} ${student.lastName}`} meta={current} />
              <View style={styles.chips}>
                {MARKS.map((mark) => (
                  <Pressable
                    key={mark}
                    onPress={() => setMarks((prev) => ({ ...prev, [student.id]: mark }))}
                    style={[styles.chip, current === mark && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, current === mark && styles.chipTextOn]}>
                      {mark === "present" ? "Here" : mark === "absent" ? "Out" : mark === "excused" ? "Exc." : "Late"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
        {message ? <Copy>{message}</Copy> : null}
        <Button label={pending ? "Saving..." : "Save attendance"} onPress={save} disabled={pending || !classId} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
  student: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.green, fontWeight: "700" },
  chipTextOn: { color: colors.white },
});
