import { useState } from "react";
import { Redirect } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Copy, Field, Kicker, Title } from "@/components/Ui";
import { useAuth } from "@/context/Auth";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const { user, ready, schoolCode, setSchoolCode, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (ready && user) return <Redirect href="/(app)" />;

  async function onSubmit() {
    setError("");
    setPending(true);
    try {
      await login({ schoolCode, email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page}>
          <Card>
            <Kicker>Welcome</Kicker>
            <Title>Parent</Title>
            <Copy>Assalamu alaikum. Sign in to see your children.</Copy>
            <Field
              value={schoolCode}
              onChangeText={setSchoolCode}
              placeholder="School code"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={pending ? "Signing in..." : "Sign in"} onPress={onSubmit} disabled={pending} />
          </Card>
          <View>
            <Text style={styles.foot}>© 2026 Dr. Askar. All rights reserved.</Text>
            <Text style={styles.foot}>Designed and developed by Powered by Automation, LLC.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 20, gap: 18, justifyContent: "center", flexGrow: 1 },
  error: { color: colors.late },
  foot: { textAlign: "center", color: colors.muted, fontSize: 12, lineHeight: 18 },
});
