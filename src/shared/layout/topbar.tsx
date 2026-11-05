"use client";

import { Bell, CircleHelp, Grid3x3, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { APP_META } from "./nav-config";
import { ThemeToggle } from "./theme-toggle";
import { useUiStore } from "./ui-store";

export interface TopbarUser {
  initials: string;
  name: string;
  role: string;
}

export function Topbar({ user, onSignOut }: { user: TopbarUser | null; onSignOut?: () => void }) {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
        <Menu aria-hidden />
      </Button>
      <div className="hidden items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-sm md:flex" title="Neo Suite applications">
        <Grid3x3 className="size-4 text-muted" aria-hidden />
        <span className="font-medium text-fg">Neo Suite</span>
        <span className="text-subtle">CAS · FSA · LMS</span>
      </div>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 text-left text-sm text-subtle transition-colors hover:border-info/60 md:max-w-xl"
        aria-label="Search customer, case, account number (Command K)"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Search customer, case, account no...</span>
        <kbd className="num ml-auto hidden rounded border border-border-strong px-1.5 text-[10px] sm:inline">⌘ K</kbd>
      </button>
      <span className="num hidden rounded-md border border-warning/60 px-2 py-1 text-[11px] tracking-wider text-warning xl:inline">
        {APP_META.environment} · {APP_META.tenantCode}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications (1 unread)" className="relative">
          <Bell aria-hidden />
          <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-magenta" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Help" className="hidden sm:inline-flex">
          <CircleHelp aria-hidden />
        </Button>
      </div>
      {user ? (
        <div className="hidden items-center gap-3 border-l border-border pl-4 md:flex">
          <span aria-hidden className="grid size-9 place-items-center rounded-full border border-info/40 bg-info/10 text-xs font-semibold text-info">
            {user.initials}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-fg">{user.name}</span>
            <span className="block text-xs text-muted">{user.role}</span>
          </span>
          {onSignOut ? (
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={onSignOut}>
              <LogOut aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
