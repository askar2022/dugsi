import { PortalShell } from "@/components/portal/PortalShell";

export default function ParentLayout({ children }: LayoutProps<"/parent">) {
  return (
    <PortalShell role="PARENT" title="Parent Portal">
      {children}
    </PortalShell>
  );
}
