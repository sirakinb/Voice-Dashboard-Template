import { NextResponse, type NextRequest } from "next/server";
import {
  INSFORGE_ACCESS_COOKIE,
  INSFORGE_REFRESH_COOKIE,
  protectedRoutes,
} from "@/lib/insforge/constants";

export async function middleware(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get(INSFORGE_ACCESS_COOKIE)?.value);
  const hasRefreshToken = Boolean(
    request.cookies.get(INSFORGE_REFRESH_COOKIE)?.value
  );
  const hasSessionCookie = hasAccessToken || hasRefreshToken;
  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(route + "/")
  );

  if (isProtectedRoute && !hasSessionCookie) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (request.nextUrl.pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
