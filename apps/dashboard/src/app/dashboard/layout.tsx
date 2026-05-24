import { DashboardSidebarWrapper } from "@/components/dashboard-sidebar-wrapper";
import React from "react";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  const merchants =
    (session?.user as { merchants?: { id: string; name?: string }[] })
      ?.merchants || [];

  // Get current pathname from headers (since we are in a SC layout)
  // Or, simpler strategy: Just check the merchants count.
  // We can't easily get pathname in SC layout without headers hacks.

  await headers();
  // x-url is often not reliable locally without middleware injection.
  // Instead, let's use a client component wrapper or middleware? No, middleware is best.
  // But since I am here, let's assume if merchants.length === 0, render ONLY onboarding content?
  // No, that messes up the URL structure.

  // Let's use a simple heuristic:
  // If NO merchants, and we render `children`, `children` might be the main dashboard which crashes.
  // So if NO merchants, we should Redirect to /dashboard/onboarding.
  // BUT if we are ALREADY at /dashboard/onboarding, we shouldn't redirect loop.

  // Actually, Middleware is the cleanest place for this.
  // Let's assume I'll add middleware next.
  // For now, I'll just leave the layout as is and focus on the middleware logic?
  // No, user request was "Can't we let user create by their own".
  // The layout wraps everything.

  // Let's modify the layout to conditionally render Sidebar based on merchant existence?
  // If no merchants, maybe hide sidebar?

  const hasMerchants = merchants.length > 0;

  return (
    <div className="flex h-svh flex-col overflow-hidden [--header-height:--spacing(14)]">
      <DashboardSidebarWrapper session={session} hasMerchants={hasMerchants}>
        {children}
      </DashboardSidebarWrapper>
    </div>
  );
}
