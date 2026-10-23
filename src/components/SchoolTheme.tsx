import type { ReactNode } from "react";
import { resolvePageColor } from "@/lib/page-color";

export function SchoolTheme({
  pageColor,
  children,
  className,
}: {
  pageColor?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const theme = resolvePageColor(pageColor);
  return (
    <div className={className ?? "school-theme"} style={theme.vars}>
      {children}
    </div>
  );
}
