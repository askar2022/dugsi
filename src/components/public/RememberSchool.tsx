"use client";

import { useEffect } from "react";
import { SCHOOL_COOKIE } from "@/lib/school-cookie";

export function RememberSchool({ code }: { code: string }) {
  useEffect(() => {
    const school = code.trim().toLowerCase();
    if (!school) return;
    document.cookie = `${SCHOOL_COOKIE}=${school}; path=/; max-age=15552000; samesite=lax`;
  }, [code]);
  return null;
}
