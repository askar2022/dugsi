export function schoolLoginPath(
  portal: "parent" | "staff",
  schoolCode?: string | null,
  next?: string | null,
) {
  const params = new URLSearchParams();
  if (schoolCode) params.set("school", schoolCode.toLowerCase());
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `/login/${portal}?${query}` : `/login/${portal}`;
}
