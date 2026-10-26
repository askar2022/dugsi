"use client";

import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ResetEmailForm } from "@/components/account/ResetEmailForm";
import { PageHeader } from "@/components/portal/PageHeader";

export default function ParentPasswordPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Password"
        description="Change your password while signed in. If you forget it, use Reset password on the parent sign-in page. We email the link to you."
      />
      <ResetEmailForm />
      <ChangePasswordForm />
    </div>
  );
}
