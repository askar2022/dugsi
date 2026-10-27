import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_OTP_COOKIE, clearAdminOtpCookies } from "@/lib/admin-otp";
import { skipAdminLoginCode } from "@/lib/demo-school";
import { roleLoginPath } from "@/lib/login-path";
import { SCHOOL_COOKIE, schoolFromCookie } from "@/lib/school-cookie";
import { applySupabaseEnv } from "@/lib/supabase-env";
import { portalForRole, type Role } from "@/lib/types";

function expectedRole(pathname: string) {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/teacher")) return "TEACHER";
  if (pathname.startsWith("/parent")) return "PARENT";
  if (pathname.startsWith("/platform")) return "PLATFORM";
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleNeeded = expectedRole(pathname);
  if (!roleNeeded) return NextResponse.next();

  let response = NextResponse.next({ request });
  applySupabaseEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const school = schoolFromCookie(request.cookies.get(SCHOOL_COOKIE)?.value);
    const fallback = roleLoginPath(roleNeeded, school);
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const school = schoolFromCookie(request.cookies.get(SCHOOL_COOKIE)?.value);
    const loginPath = roleLoginPath(roleNeeded, school, pathname);
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const role = String(data.user.app_metadata?.role ?? "") as Role;
  const allowed = role === roleNeeded || (roleNeeded === "ADMIN" && role === "STAFF");
  if (!allowed) {
    return NextResponse.redirect(new URL(portalForRole(role), request.url));
  }

  const school = schoolFromCookie(request.cookies.get(SCHOOL_COOKIE)?.value);
  const demoLogin = skipAdminLoginCode({
    slug: school ?? String(data.user.app_metadata?.tenant_slug ?? ""),
    tenantId: data.user.app_metadata?.tenant_id ? String(data.user.app_metadata.tenant_id) : null,
    email: data.user.email,
  });
  if (
    (roleNeeded === "ADMIN" || roleNeeded === "PLATFORM") &&
    request.cookies.get(ADMIN_OTP_COOKIE)?.value === "pending"
  ) {
    if (demoLogin) {
      clearAdminOtpCookies(response);
      return response;
    }
    const loginPath = roleLoginPath(roleNeeded, school, pathname);
    const nextUrl = new URL(loginPath, request.url);
    nextUrl.searchParams.set("code", "1");
    return NextResponse.redirect(nextUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*", "/platform/:path*"],
};
