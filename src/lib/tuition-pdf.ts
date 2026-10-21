import { downloadTablePdf } from "@/lib/table-pdf";

export function downloadTuitionPdf(input: {
  schoolName: string;
  filterLabel: string;
  rows: Array<{ student: string; amount: string; dueDate: string; status: string }>;
  total: string;
}) {
  downloadTablePdf({
    title: input.schoolName || "Tuition records",
    subtitle: `Tuition filter: ${input.filterLabel}`,
    filename: `tuition-${input.filterLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    columns: [
      { key: "student", label: "Student", x: 40 },
      { key: "amount", label: "Amount", x: 220 },
      { key: "dueDate", label: "Due date", x: 300 },
      { key: "status", label: "Status", x: 400 },
    ],
    rows: input.rows,
    footer: `Total on this list: ${input.total}. This is a record, not a payment page.`,
  });
}
