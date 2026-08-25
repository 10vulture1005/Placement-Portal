import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessAdminRoute, isElevatedRole } from "@/lib/permissions";
import { isAdminEmail } from "@/lib/auth-access";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  if (pathname.startsWith("/admin")) {
    const isBootstrapAdmin = isAdminEmail(session.user.email);
    const hasCustomPerms =
      (session.user.customPermissions?.length ?? 0) > 0 ||
      (session.user.effectivePermissions?.length ?? 0) > 0;
    if (!isBootstrapAdmin && !isElevatedRole(session.user.role) && !hasCustomPerms) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (!canAccessAdminRoute(session.user, pathname)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/company-events/:path*",
    "/applications/:path*",
    "/feedback/:path*",
    "/profile/:path*",
    "/forms/:path*",
    "/contact/:path*",
    "/team/:path*",
    "/admin/:path*",
  ],
};
