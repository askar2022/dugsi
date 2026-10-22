import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Kicker, Row, Title } from "@/components/Ui";
import { useAuth } from "@/context/Auth";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class?: { name?: string } | { name?: string }[] | null;
};

function classNameOf(student: Student) {
  const value = student.class;
  return (Array.isArray(value) ? value[0] : value)?.name ?? "Class";
}

export default function TeacherHomeScreen() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    api<{ students: Student[] }>("/api/students")
      .then((data) => setStudents(data.students))
      .catch(() => setStudents([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Kicker>Assalamu alaikum</Kicker>
        <Title>{user?.name ?? "Teacher"}</Title>
        <Copy>{user?.tenantName ?? "Your class"}</Copy>
        <Copy>{students.length ? `${students.length} students in your class.` : "No students assigned yet."}</Copy>
      </Card>
      <Card>
        <Kicker>Class roster</Kicker>
        {students.map((student) => (
          <Row
            key={student.id}
            title={`${student.firstName} ${student.lastName}`}
            meta={classNameOf(student)}
          />
        ))}
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
