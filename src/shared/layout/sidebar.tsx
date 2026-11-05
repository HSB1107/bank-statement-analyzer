"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";
import { Logo } from "./logo";
import { APP_META, NAV_SECTIONS, type NavBadgeKey, type NavItem } from "./nav-config";

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return (item.activePrefixes ?? []).some((p) => pathname.startsWith(p));
}

export function Sidebar({
  badges,
  onNavigate,
}: {
  badges?: Partial<Record<NavBadgeKey, number>>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="FinnOne Neo — Executive Dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 scrollbar-thin overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-5">
            <p className="label-micro mb-2 px-2 text-[10px]">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item, pathname);
                const badge = item.badge ? badges?.[item.badge] : undefined;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-lime/10 font-medium text-fg before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-0.5 before:rounded-full before:bg-lime"
                          : "text-muted hover:bg-surface-3 hover:text-fg",
                      )}
                    >
                      <Icon
                        className={cn("size-4 shrink-0", active ? "text-lime" : "text-subtle")}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge !== undefined ? (
                        <span className="num text-[11px] text-subtle">{formatCount(badge)}</span>
                      ) : null}
                      {item.pass === 2 ? <span className="sr-only">(coming in Pass 2)</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-5 py-4 font-mono text-[11px] leading-relaxed text-subtle">
        <p className="text-muted">{APP_META.version}</p>
        <p>{APP_META.build}</p>
        <p className="flex items-center gap-1.5 text-warning">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" /> DEMO DATA
        </p>
      </div>
    </div>
  );
}
