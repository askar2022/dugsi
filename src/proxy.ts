import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { schoolLoginPath } from "@/lib/login-path";
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
    const fallback = roleNeeded === "PARENT" ? schoolLoginPath("parent") : roleNeeded === "PLATFORM" ? "/login" : schoolLoginPath("staff");
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
    const loginPath = roleNeeded === "PARENT" ? schoolLoginPath("parent", null, pathname) : roleNeeded === "PLATFORM" ? "/login" : schoolLoginPath("staff", null, pathname);
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const role = String(data.user.app_metadata?.role ?? "") as Role;
  const allowed = role === roleNeeded || (roleNeeded === "ADMIN" && role === "STAFF");
  if (!allowed) {
    return NextResponse.redirect(new URL(portalForRole(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*", "/platform/:path*"],
};
