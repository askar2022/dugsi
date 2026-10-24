export function chicagoNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
  };
}

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function mostRecentFriday(date: string) {
  const current = new Date(`${date}T12:00:00`);
  const back = (current.getDay() + 2) % 7;
  return addDays(date, -back);
}

export function fridayWindows(friday: string) {
  return {
    thisWeek: { start: addDays(friday, -6), end: friday },
    lastWeek: { start: addDays(friday, -13), end: addDays(friday, -7) },
  };
}

export function previousMonth(friday: string) {
  const [year, month] = friday.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const end = addDays(`${year}-${String(month).padStart(2, "0")}-01`, -1);
  return { start, end, label: monthLabel(start) };
}

export function isFirstFriday(friday: string) {
  return Number(friday.slice(8, 10)) <= 7;
}

export function monthLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function formatDateRange(start: string, end: string) {
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  const year = to.getFullYear();
  const startMonth = from.toLocaleString("en-US", { month: "long" });
  const endMonth = to.toLocaleString("en-US", { month: "long" });
  if (from.getMonth() === to.getMonth()) {
    return `${startMonth} ${from.getDate()}–${to.getDate()}, ${year}`;
  }
  return `${startMonth} ${from.getDate()}–${endMonth} ${to.getDate()}, ${year}`;
}
