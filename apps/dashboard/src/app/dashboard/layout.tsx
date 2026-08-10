import { DashboardSidebarWrapper } from "@/components/dashboard-sidebar-wrapper";
import React from "react";

import { auth } from "@/auth";
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

  const hasMerchants = merchants.length > 0;

  return (
    <div className="flex h-svh flex-col overflow-hidden [--header-height:--spacing(14)]">
      <DashboardSidebarWrapper session={session} hasMerchants={hasMerchants}>
        {children}
      </DashboardSidebarWrapper>
    </div>
  );
}
