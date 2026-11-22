"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function ResetEmailForm() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    api<{ email?: string }>("/api/auth/account")
      .then((data) => setEmail(data.email ?? ""))
      .catch(() => setEmail(""));
  }, []);

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <div>
        <h2 className="page-title" style={{ fontSize: "1.5rem" }}>Registered email</h2>
        <p className="page-copy">
          Password reset is sent only to the email registered on this login. It cannot be changed to another inbox here.
        </p>
      </div>
      <p className="text-sm text-green">{email || "No registered email is on this login."}</p>
    </div>
  );
}
