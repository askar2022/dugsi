"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  period: string | null;
  student: { firstName: string; lastName: string };
};

type Student = { id: string; firstName: string; lastName: string };

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [invoiceData, studentData] = await Promise.all([
      api<{ invoices: Invoice[] }>("/api/invoices"),
      api<{ students: Student[] }>("/api/students"),
    ]);
    setInvoices(invoiceData.invoices);
    setStudents(studentData.students);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    await api("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ ...raw, amount: Number(raw.amount) }),
    });
    form.reset();
    setMessage("Billing record saved. This is documentation only, not a payment charge.");
    await load();
  }

  async function recordPayment(id: string) {
    await api(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "record-payment" }),
    });
    setMessage("Payment recorded as green/paid and a parent email was logged.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Tuition records</h3>
        <p className="text-muted">Green is paid, yellow is due, red is late. Dugsi does not take card payments.</p>
      </div>
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Student">
          <select className="select" name="studentId" required>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount"><input className="input" name="amount" type="number" step="0.01" required /></FormField>
        <FormField label="Due date"><input className="input" name="dueDate" type="date" required /></FormField>
        <FormField label="Period"><input className="input" name="period" placeholder="October 2026" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Add billing record</button>
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.student.firstName} {invoice.student.lastName}</td>
                <td>${invoice.amount.toFixed(2)}</td>
                <td>{invoice.dueDate}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td>
                  {invoice.status !== "paid" ? (
                    <button className="btn btn-ghost py-1 text-xs" onClick={() => recordPayment(invoice.id)}>
                      Record paid
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
