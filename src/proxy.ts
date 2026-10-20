import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { portalForRole } from "@/lib/types";

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

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  const allowed =
    session.role === roleNeeded ||
    (roleNeeded === "ADMIN" && session.role === "STAFF");

  if (!allowed) {
    return NextResponse.redirect(new URL(portalForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*", "/platform/:path*"],
};
