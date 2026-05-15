import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Only dashboard routes require authentication
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|api/sw|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
