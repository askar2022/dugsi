import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { api, setToken } from "./src/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "PARENT" | "STAFF" | "PLATFORM";
  tenantName: string | null;
  tenantSlug: string | null;
};

type Student = { id: string; firstName: string; lastName: string; status: string };
type Invoice = { id: string; amount: number; status: string; student: { firstName: string; lastName: string } };

export default function App() {
  const [schoolCode, setSchoolCode] = useState("noor");
  const [email, setEmail] = useState("admin@noor.dugsi");
  const [password, setPassword] = useState("Dugsi123!");
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    try {
      const data = await api<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ schoolCode, email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      const studentData = await api<{ students: Student[] }>("/api/students");
      setStudents(studentData.students);
      if (data.user.role === "ADMIN" || data.user.role === "STAFF" || data.user.role === "PARENT") {
        const invoiceData = await api<{ invoices: Invoice[] }>("/api/invoices");
        setInvoices(invoiceData.invoices);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setStudents([]);
    setInvoices([]);
  }

  const title =
    user?.role === "TEACHER"
      ? "Teacher Portal"
      : user?.role === "PARENT"
        ? "Parent"
        : "Dugsi Management";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        {!user ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>DUGSI</Text>
            <Text style={styles.title}>Sign in with your school code</Text>
            <TextInput style={styles.input} value={schoolCode} onChangeText={setSchoolCode} placeholder="School code" autoCapitalize="none" />
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} onPress={login}>
              <Text style={styles.buttonText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.kicker}>{user.tenantSlug}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.muted}>{user.tenantName}</Text>
            <Text style={styles.muted}>{user.name} · {user.role}</Text>
            <Text style={styles.section}>This school only</Text>
            {students.map((student) => (
              <Text key={student.id} style={styles.row}>
                {student.firstName} {student.lastName} · {student.status}
              </Text>
            ))}
            {invoices.length ? <Text style={styles.section}>Tuition records</Text> : null}
            {invoices.map((invoice) => (
              <Text key={invoice.id} style={styles.row}>
                {invoice.student.firstName}: ${invoice.amount.toFixed(0)} · {invoice.status}
              </Text>
            ))}
            <Pressable style={styles.button} onPress={logout}>
              <Text style={styles.buttonText}>Sign out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B3D2E" },
  container: { padding: 20, gap: 16 },
  card: { backgroundColor: "#F7F3EB", borderRadius: 24, padding: 20, gap: 12 },
  kicker: { color: "#C4A35A", letterSpacing: 2, fontWeight: "700" },
  title: { color: "#0B3D2E", fontSize: 28, fontWeight: "700" },
  muted: { color: "#5C6B64" },
  input: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#DDD4C4" },
  button: { backgroundColor: "#0B3D2E", borderRadius: 999, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#B91C1C" },
  section: { marginTop: 8, fontWeight: "700", color: "#0B3D2E" },
  row: { color: "#10231C" },
});
