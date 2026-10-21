const TONES: Record<string, string> = {
  paid: "bg-green-soft text-paid",
  present: "bg-green-soft text-paid",
  enrolled: "bg-green-soft text-paid",
  active: "bg-green-soft text-paid",
  due: "bg-gold-soft text-due",
  pending: "bg-gold-soft text-due",
  invited: "bg-gold-soft text-due",
  declined: "bg-red-50 text-late",
  unenrolled: "bg-red-50 text-late",
  late: "bg-red-50 text-late",
  absent: "bg-red-50 text-late",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        TONES[status] ?? "bg-green-soft text-green"
      }`}
    >
      {status}
    </span>
  );
}
