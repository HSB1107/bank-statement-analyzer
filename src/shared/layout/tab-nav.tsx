import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export interface TabNavItem {
  id: string;
  label: string;
  href: string;
  badge?: number;
}

/** Route-backed tabs (each tab is a URL). */
export function TabNav({ items, activeId, label }: { items: readonly TabNavItem[]; activeId: string; label: string }) {
  return (
    <nav aria-label={label} className="scrollbar-thin mb-5 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {items.map((t) => {
          const active = t.id === activeId;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2.5 text-[15px] transition-colors",
                  active ? "text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-lime" : "text-muted hover:text-fg",
                )}
              >
                {t.label}
                {t.badge !== undefined ? <span className="num rounded bg-negative/20 px-1.5 text-[10px] text-negative">{t.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
