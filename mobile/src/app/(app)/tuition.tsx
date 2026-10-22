import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, Copy, Row, StatusText, Title } from "@/components/Ui";
import { useFamily } from "@/context/Family";
import { api } from "@/lib/api";
import { childName, classPlaceLabel, money } from "@/lib/family";
import { colors } from "@/lib/theme";

type Invoice = {
  amount: number;
  dueDate: string;
  status: string;
  studentId?: string;
  student?: { id?: string; firstName: string; lastName: string } | { id?: string }[] | null;
};

function studentIdOf(invoice: Invoice) {
  if (invoice.studentId) return invoice.studentId;
  const student = Array.isArray(invoice.student) ? invoice.student[0] : invoice.student;
  return student?.id ?? "";
}

export default function TuitionScreen() {
  const { children, ready } = useFamily();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api<{ invoices: Invoice[] }>("/api/invoices")
      .then((data) => setInvoices(data.invoices))
      .catch(() => setInvoices([]));
  }, []);

  const rows = useMemo(() => {
    return children.map((child) => {
      const bills = invoices.filter((invoice) => studentIdOf(invoice) === child.id);
      const paid = bills.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const remaining = bills.filter((item) => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const nextDue = bills.filter((item) => item.status !== "paid").map((item) => item.dueDate).sort()[0] ?? "";
      const status = bills.some((item) => item.status === "late") ? "late" : remaining ? "due" : bills.length ? "paid" : "none";
      return { id: child.id, name: childName(child), className: classPlaceLabel(child), paid, remaining, nextDue, status };
    });
  }, [children, invoices]);

  const totalDue = rows.reduce((sum, row) => sum + row.remaining, 0);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <Title>Tuition</Title>
        <Copy>Green is paid. Yellow is due. Red is late. Pay at the dugsi.</Copy>
        <StatusText status={totalDue ? "due" : "paid"} label={totalDue ? `Family due ${money(totalDue)}` : "Family is paid"} />
        {!ready ? <Copy>Loading tuition.</Copy> : null}
        {rows.map((row) => (
          <Row
            key={row.id}
            title={row.name}
            meta={`${row.className}${row.nextDue ? ` · due ${row.nextDue}` : ""}`}
            right={`${money(row.remaining)} ${row.status}`}
          />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: colors.cream, flexGrow: 1, paddingBottom: 32 },
});
