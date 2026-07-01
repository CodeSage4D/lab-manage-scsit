import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

// Run middleware in standard Node.js runtime to support native crypto functions safely
export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes, excluding login and assets
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionCookie = request.cookies.get("suas_session")?.value;

    if (!sessionCookie) {
      // Redirect to login page if session cookie is missing
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = verifyToken(sessionCookie);
    if (!payload) {
      // Session is invalid or expired
      const loginUrl = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("suas_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
