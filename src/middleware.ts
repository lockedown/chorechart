import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIX_PATHS = ["/login"];
const PUBLIC_EXACT_PATHS = new Set(["/api/cron/allowances", "/api/ops/migrate"]);
const PUBLIC_FILES = new Set([
  "/manifest.json",
  "/site.webmanifest",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/icon-192.png",
  "/icon-192.svg",
  "/icon-512.png",
  "/icon-512.svg",
  "/robots.txt",
  "/sitemap.xml",
]);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PREFIX_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_FILES.has(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILES.has(pathname)
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
      if (isPublicPath(pathname)) {
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
  if (isPublicPath(pathname)) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|site.webmanifest|apple-touch-icon.png|apple-touch-icon-precomposed.png|icon-192.png|icon-192.svg|icon-512.png|icon-512.svg|robots.txt|sitemap.xml).*)"],
};
