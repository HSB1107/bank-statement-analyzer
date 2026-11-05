"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { CommandPalette, type CommandGroup } from "./command-palette";
import { FooterStrip } from "./footer-strip";
import { type NavBadgeKey } from "./nav-config";
import { Sidebar } from "./sidebar";
import { Topbar, type TopbarUser } from "./topbar";
import { useUiStore } from "./ui-store";

export interface AppShellProps {
  children: ReactNode;
  user: TopbarUser | null;
  badges?: Partial<Record<NavBadgeKey, number>>;
  commandGroups: readonly CommandGroup[];
  onSignOut?: () => void;
}

export function AppShell({ children, user, badges, commandGroups, onSignOut }: AppShellProps) {
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 border-r border-border bg-surface/70 lg:block">
        <Sidebar badges={badges} />
      </aside>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-surface lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation" className="absolute top-2.5 right-2">
                <X aria-hidden />
              </Button>
            </Dialog.Close>
            <Sidebar badges={badges} onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onSignOut={onSignOut} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-5 outline-none md:px-6">
          {children}
        </main>
        <FooterStrip />
      </div>
      <CommandPalette groups={commandGroups} />
    </div>
  );
}
