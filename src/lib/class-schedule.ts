export const CLASS_DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const CLASS_DAY_PRESETS = [
  { id: "saturday", label: "Saturday", days: ["Saturday"] },
  { id: "weekend", label: "Weekend", days: ["Saturday", "Sunday"] },
  { id: "weekdays", label: "Monday–Thursday", days: ["Monday", "Tuesday", "Wednesday", "Thursday"] },
  { id: "custom", label: "Custom", days: null },
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Weekday = (typeof CLASS_DAY_OPTIONS)[number];

function knownDay(value: string): Weekday | null {
  const needle = value.trim().toLowerCase();
  return CLASS_DAY_OPTIONS.find((day) => day.toLowerCase() === needle) ?? null;
}

export function classDays(dayOfWeek?: string | null) {
  const raw = (dayOfWeek ?? "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/[,&]| and /i)
    .map((part) => knownDay(part))
    .filter((day): day is Weekday => day !== null);
  return CLASS_DAY_OPTIONS.filter((day) => parts.includes(day));
}

export function serializeClassDays(days: string[]) {
  return classDays(days.join(",")).join(",");
}

export function classMeetsOn(dayOfWeek: string | null | undefined, weekday: string) {
  const target = weekday.trim().toLowerCase();
  return classDays(dayOfWeek).some((day) => day.toLowerCase() === target);
}

export function matchingDayPreset(days: string[]) {
  const selected = serializeClassDays(days);
  const match = CLASS_DAY_PRESETS.find((preset) => preset.days && serializeClassDays([...preset.days]) === selected);
  return match?.id ?? "custom";
}

export function formatClassDays(dayOfWeek?: string | null) {
  const days = classDays(dayOfWeek);
  if (!days.length) return "";
  if (days.length === 1) return days[0];
  const indexes = days.map((day) => CLASS_DAY_OPTIONS.indexOf(day as typeof CLASS_DAY_OPTIONS[number]));
  const consecutive = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1);
  if (consecutive) return `${days[0]}–${days[days.length - 1]}`;
  return days.join(", ");
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
  const day = formatClassDays(dayOfWeek);
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
