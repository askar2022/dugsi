export const CLASS_DAYS = [
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
  { value: "Saturday & Sunday", label: "Saturday & Sunday" },
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function classDays(dayOfWeek?: string | null) {
  const raw = (dayOfWeek ?? "").trim();
  if (!raw) return [];
  if (raw.includes("&")) {
    return raw.split("&").map((part) => part.trim()).filter(Boolean);
  }
  return [raw];
}

export function classMeetsOn(dayOfWeek: string | null | undefined, weekday: string) {
  const target = weekday.trim().toLowerCase();
  return classDays(dayOfWeek).some((day) => day.toLowerCase() === target);
}

export function nextClassDate(dayOfWeek?: string | null, now = new Date()) {
  const dates = classDays(dayOfWeek)
    .map((day) => {
      const target = WEEKDAYS.findIndex((item) => item.toLowerCase() === day.toLowerCase());
      if (target < 0) return null;
      const date = new Date(now);
      date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7));
      return date;
    })
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => left.getTime() - right.getTime());
  return dates[0] ?? new Date(now);
}

function formatClock(value?: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${(minutes ?? "00").slice(0, 2).padStart(2, "0")} ${suffix}`;
}

export function formatClassHours(start?: string | null, end?: string | null) {
  const from = formatClock(start);
  const to = formatClock(end);
  if (from && to) {
    const fromSuffix = from.slice(-2);
    const toSuffix = to.slice(-2);
    if (fromSuffix === toSuffix) return `${from.slice(0, -3)}–${to}`;
    return `${from}–${to}`;
  }
  return from || to;
}

export function formatClassWhen(dayOfWeek?: string | null, start?: string | null, end?: string | null) {
  const hours = formatClassHours(start, end);
  const day = (dayOfWeek ?? "").trim();
  if (day && hours) return `${day} · ${hours}`;
  return day || hours;
}

export function assistantIdFromRoom(room?: string | null) {
  if (!room?.startsWith("asst:")) return null;
  return room.slice(5) || null;
}

export function roomForAssistant(assistantId?: string | null) {
  return assistantId ? `asst:${assistantId}` : null;
}
