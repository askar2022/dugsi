import { PortalShell } from "@/components/portal/PortalShell";

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <PortalShell role="TEACHER" title="Teacher Portal">
      {children}
    </PortalShell>
  );
}
