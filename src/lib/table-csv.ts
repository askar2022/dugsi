export function downloadTableCsv(input: {
  filename: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
}) {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [
    input.columns.map((column) => escape(column.label)).join(","),
    ...input.rows.map((row) => input.columns.map((column) => escape(row[column.key] ?? "")).join(",")),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = input.filename;
  link.click();
  URL.revokeObjectURL(url);
}
