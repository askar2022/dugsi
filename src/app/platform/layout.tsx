import { PortalShell } from "@/components/portal/PortalShell";

export default function PlatformLayout({ children }: LayoutProps<"/platform">) {
  return (
    <PortalShell role="PLATFORM" title="All Dugsis">
      {children}
    </PortalShell>
  );
}
