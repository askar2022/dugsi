import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Field, Row, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  class?: { name?: string } | { name?: string }[] | null;
};

function classNameOf(student: Student) {
  const value = student.class;
  return (Array.isArray(value) ? value[0] : value)?.name ?? "Waiting for assessment";
}

export default function OfficeStudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<{ students: Student[] }>("/api/students")
      .then((data) => setStudents(data.students))
      .catch(() => setStudents([]));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (!needle) return true;
      return `${student.firstName} ${student.lastName}`.toLowerCase().includes(needle);
    });
  }, [query, students]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Students</Title>
        <Copy>Search this school’s students. Full edits stay on the website.</Copy>
        <Field value={query} onChangeText={setQuery} placeholder="Search a child" autoCorrect={false} />
        {visible.map((student) => (
          <Row
            key={student.id}
            title={`${student.firstName} ${student.lastName}`}
            meta={classNameOf(student)}
            right={student.status.replace("_", " ")}
          />
        ))}
        {visible.length === 0 ? <Copy>No students match that name.</Copy> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
