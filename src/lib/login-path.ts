export function schoolLoginPath(
  portal: "parent" | "staff",
  schoolCode?: string | null,
  next?: string | null,
) {
  const code = schoolCode?.trim().toLowerCase();
  const path = code ? `/${code}/${portal}` : `/login/${portal}`;
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}
