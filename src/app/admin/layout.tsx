import { PortalShell } from "@/components/portal/PortalShell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <PortalShell role="ADMIN" title="Dugsi Management">
      {children}
    </PortalShell>
  );
}
