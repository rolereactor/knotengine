import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Marketing pages and auth pages are public — no login required
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  // Protected routes — require session
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────
  // Onboarding Logic
  // ──────────────────────────────────────────────
  // @ts-expect-error - Next-auth types
  const merchants = req.auth.user?.merchants || [];
  const isOnboardingPage = pathname === "/dashboard/onboarding";
  const hasMerchants = merchants.length > 0;

  // 1. User has NO merchants -> Force them to /dashboard/onboarding
  if (!hasMerchants && !isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard/onboarding", req.url));
  }

  // 2. User HAS merchants -> Prevent them from visiting /dashboard/onboarding (redirect to main dashboard)
  if (hasMerchants && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ──────────────────────────────────────────────
  // Two-Factor Authentication Challenge
  // ──────────────────────────────────────────────
  const is2FAPage = pathname === "/dashboard/2fa";
  // @ts-expect-error - 2FA fields
  const twoFactorRequired = req.auth.user?.twoFactorRequired || false;
  // @ts-expect-error - 2FA fields
  const twoFactorVerified = req.auth.user?.twoFactorVerified || false;

  // 3. Merchant requires 2FA but hasn't verified yet -> Redirect to 2FA challenge
  if (
    hasMerchants &&
    twoFactorRequired &&
    !twoFactorVerified &&
    !is2FAPage &&
    // Allow API proxy requests to pass through (needed for 2FA validation endpoint)
    !pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/dashboard/2fa", req.url));
  }

  // 4. Merchant has verified 2FA (or doesn't need it) -> Prevent visiting /dashboard/2fa
  if (is2FAPage && (!twoFactorRequired || twoFactorVerified)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
