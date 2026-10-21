"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  vendor: string | null;
  description: string | null;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function load() {
    const data = await api<{ expenses: Expense[] }>("/api/expenses");
    setExpenses(data.expenses);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    await api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ ...raw, amount: Number(raw.amount) }),
    });
    form.reset();
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Expenses" description="Salaries, rent, equipment, and other school costs." />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Category">
          <select className="select" name="category" defaultValue="salary">
            <option value="salary">Teacher salary</option>
            <option value="rent">Rent</option>
            <option value="equipment">Equipment</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Amount"><input className="input" name="amount" type="number" step="0.01" required /></FormField>
        <FormField label="Date"><input className="input" name="date" type="date" required /></FormField>
        <FormField label="Vendor"><input className="input" name="vendor" /></FormField>
        <div className="md:col-span-2">
          <FormField label="Description"><input className="input" name="description" /></FormField>
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Add expense</button>
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Vendor</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="capitalize">{expense.category}</td>
                <td>${expense.amount.toFixed(2)}</td>
                <td>{expense.date}</td>
                <td>{expense.vendor ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
