"use client";

import { type ReactNode } from "react";
import { AppShell } from "@/shared/layout/app-shell";
import { ALL_NAV_ITEMS } from "@/shared/layout/nav-config";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      user={{ initials: "PR", name: "Priya Raman", role: "Senior Underwriter · Retail & SME" }}
      commandGroups={[
        { heading: "Screens", items: ALL_NAV_ITEMS.map((i) => ({ id: i.id, label: i.label, href: i.href })) },
      ]}
    >
      {children}
    </AppShell>
  );
}
