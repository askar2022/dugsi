const TONES: Record<string, string> = {
  paid: "bg-green-soft text-paid",
  present: "bg-green-soft text-paid",
  enrolled: "bg-green-soft text-paid",
  active: "bg-green-soft text-paid",
  on_track: "bg-green-soft text-paid",
  done: "bg-green-soft text-paid",
  reading: "bg-green-soft text-paid",
  memorization: "bg-green-soft text-paid",
  review: "bg-gold-soft text-due",
  written: "bg-gold-soft text-due",
  due: "bg-gold-soft text-due",
  pending: "bg-gold-soft text-due",
  accepted: "bg-gold-soft text-due",
  waiting_assessment: "bg-gold-soft text-due",
  ready_for_class: "bg-gold-soft text-due",
  submitted: "bg-gold-soft text-due",
  invited: "bg-gold-soft text-due",
  needs_practice: "bg-gold-soft text-due",
  declined: "bg-red-50 text-late",
  unenrolled: "bg-red-50 text-late",
  late: "bg-red-50 text-late",
  absent: "bg-red-50 text-late",
  contact_parent: "bg-red-50 text-late",
  needs_support: "bg-red-50 text-late",
  needs_attention: "bg-gold-soft text-due",
  support_needed: "bg-red-50 text-late",
  needs_help: "bg-red-50 text-late",
  assigned: "bg-gold-soft text-due",
  inactive: "bg-gray-100 text-muted",
  no_record: "progress-badge-none",
};

const LABELS: Record<string, string> = {
  on_track: "On Track",
  needs_practice: "Needs Attention",
  contact_parent: "Needs Support",
  done: "Done",
  needs_help: "Need Help",
  assigned: "Assigned",
  reading: "Reading",
  memorization: "Memorization",
  review: "Review",
  written: "Written Work",
  no_record: "No Record",
  needs_support: "Needs Support",
  needs_attention: "Needs Attention",
  support_needed: "Support Needed",
  strong_support: "Strong Support",
  waiting_assessment: "Waiting for Assessment",
  accepted: "Waiting for Assessment",
  ready_for_class: "Ready for Class",
  submitted: "Application Submitted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        TONES[status] ?? "bg-green-soft text-green"
      }`}
    >
      {LABELS[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}
