"use client";

import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { PageHeader } from "@/components/portal/PageHeader";

export default function ParentPasswordPage() {
  return (
    <div className="page-stack">
      <PageHeader title="Password" description="Reset your own parent password. Do not share this login." />
      <ChangePasswordForm />
    </div>
  );
}
