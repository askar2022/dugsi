import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Row, StatusText, Title } from "@/components/Ui";
import { api } from "@/lib/api";
import { money } from "@/lib/family";
import { colors } from "@/lib/theme";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  student?: { firstName?: string; lastName?: string } | { firstName?: string; lastName?: string }[] | null;
};

function studentName(invoice: Invoice) {
  const student = Array.isArray(invoice.student) ? invoice.student[0] : invoice.student;
  return student ? `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() : "Student";
}

export default function OfficeTuitionScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api<{ invoices: Invoice[] }>("/api/invoices")
      .then((data) => setInvoices(data.invoices))
      .catch(() => setInvoices([]));
  }, []);

  const totals = useMemo(() => {
    return {
      paid: invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0),
      due: invoices.filter((item) => item.status === "due").reduce((sum, item) => sum + Number(item.amount || 0), 0),
      late: invoices.filter((item) => item.status === "late").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [invoices]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Tuition</Title>
        <Copy>Green is paid. Yellow is due. Red is late. Mark paid on the website.</Copy>
        <StatusText status="paid" label={`Paid ${money(totals.paid)}`} />
        <StatusText status="due" label={`Due ${money(totals.due)}`} />
        <StatusText status="late" label={`Late ${money(totals.late)}`} />
        {invoices.slice(0, 40).map((item) => (
          <Row
            key={item.id}
            title={studentName(item)}
            meta={`Due ${item.dueDate}`}
            right={`${money(item.amount)} ${item.status}`}
          />
        ))}
        {invoices.length === 0 ? <Copy>No tuition records yet.</Copy> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
