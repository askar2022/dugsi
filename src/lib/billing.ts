export type InvoiceStatus = "paid" | "due" | "late";

export function computeInvoiceStatus(input: {
  paidDate?: string | null;
  dueDate: string;
  today?: string;
}): InvoiceStatus {
  if (input.paidDate) return "paid";
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  return input.dueDate < today ? "late" : "due";
}

export function invoiceTone(status: InvoiceStatus) {
  if (status === "paid") return "green";
  if (status === "due") return "yellow";
  return "red";
}
