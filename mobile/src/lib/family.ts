export type ParentChildClass = {
  id: string;
  name: string;
  level?: string | null;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId?: string | null;
  createdAt?: string | null;
  class?: ParentChildClass | ParentChildClass[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function childName(child: Pick<ParentChild, "firstName" | "lastName">) {
  return `${child.firstName} ${child.lastName}`.trim();
}

export function childClass(child: ParentChild): ParentChildClass | null {
  return one(child.class);
}

export function classPlaceLabel(child: ParentChild) {
  if (child.status === "waiting_assessment" || child.status === "pending") {
    return "Waiting for assessment";
  }
  return childClass(child)?.name ?? "Waiting for assessment";
}

export function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function statusColor(status: string) {
  if (status === "paid" || status === "present" || status === "on_track" || status === "done") return "#047857";
  if (status === "due" || status === "late_mark" || status === "needs_practice" || status === "needs_help") return "#B45309";
  if (status === "late" || status === "absent" || status === "off_track") return "#B91C1C";
  return "#5C6B64";
}
