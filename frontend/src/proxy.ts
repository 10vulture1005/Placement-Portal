import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/company-events/:path*", "/applications/:path*", "/feedback/:path*", "/profile/:path*", "/forms/:path*", "/contact/:path*", "/team/:path*", "/admin/:path*"]
};
