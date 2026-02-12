import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Fix origin mismatch from browser preview proxy:
  // Rewrite the origin header to match x-forwarded-host so Server Actions don't reject the request.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = request.headers.get("origin");
  if (forwardedHost && origin) {
    const originUrl = new URL(origin);
    if (originUrl.host !== forwardedHost) {
      const requestHeaders = new Headers(request.headers);
      const proto = request.headers.get("x-forwarded-proto") || originUrl.protocol.replace(":", "");
      requestHeaders.set("origin", `${proto}://${forwardedHost}`);

      // Allow public paths after fixing headers
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }

      // Check for session cookie
      const session = request.cookies.get("chorechart_session");
      if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("chorechart_session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
