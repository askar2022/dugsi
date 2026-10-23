import { Alert, ScrollView, StyleSheet } from "react-native";
import { Button, Card, Copy, Row, Title } from "@/components/Ui";
import { useFamily } from "@/context/Family";
import { api } from "@/lib/api";
import { childName, classPlaceLabel } from "@/lib/family";
import { colors } from "@/lib/theme";

export default function ChildrenScreen() {
  const { children, ready, reload } = useFamily();

  function unenroll(id: string, name: string) {
    Alert.alert("Unenroll child", `Unenroll ${name} from this dugsi? The school keeps the record.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Unenroll",
        style: "destructive",
        onPress: async () => {
          await api(`/api/students/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "unenroll" }),
          });
          await reload();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Enrolled students</Title>
        <Copy>Class, enrolled date, and current place. Names stay in your family only.</Copy>
        {!ready ? <Copy>Loading your children.</Copy> : null}
        {ready && children.length === 0 ? <Copy>No children yet. Use Enroll on the school page.</Copy> : null}
        {children.map((child) => (
          <Card key={child.id}>
            <Row title={childName(child)} meta={classPlaceLabel(child)} right={child.status.replace("_", " ")} />
            {child.status !== "unenrolled" ? (
              <Button label="Unenroll" onPress={() => unenroll(child.id, childName(child))} />
            ) : null}
          </Card>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
