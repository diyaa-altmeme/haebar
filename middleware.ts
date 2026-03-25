import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const accessCookieName = "haebar_access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(accessCookieName)?.value;

  const isAuthPage = pathname === "/login";
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = pathname.startsWith("/api/auth/");
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isStatic || isPublicApi) {
    return NextResponse.next();
  }

  if (!token && !isAuthPage && !isApi) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token && isApi) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
