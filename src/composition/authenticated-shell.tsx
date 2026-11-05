"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { AuthGuard, useSession, useSignOut } from "@/features/auth";
import { useDashboardOverview } from "@/features/dashboard";
import { AppShell } from "@/shared/layout/app-shell";
import { ALL_NAV_ITEMS } from "@/shared/layout/nav-config";

function Shell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const signOut = useSignOut();
  const router = useRouter();
  const overview = useDashboardOverview({ periodDays: 30, segment: "all", region: "all", analyst: "all" });
  const kpi = (id: string) => overview.data?.kpis.find((k) => k.id === id)?.value;
  const customers = kpi("customersAnalysed");
  const cases = kpi("analysisCases");
  return (
    <AppShell
      badges={{
        ...(customers !== undefined ? { customers } : {}),
        ...(cases !== undefined ? { cases } : {}),
      }}
      user={
        session ? { initials: session.user.initials, name: session.user.name, role: session.user.role } : null
      }
      onSignOut={() => signOut.mutate(undefined, { onSuccess: () => router.replace("/login") })}
      commandGroups={[
        { heading: "Screens", items: ALL_NAV_ITEMS.map((i) => ({ id: i.id, label: i.label, href: i.href })) },
      ]}
    >
      {children}
    </AppShell>
  );
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
