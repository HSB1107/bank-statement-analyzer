import {
  BarChart3,
  Building2,
  ClipboardList,
  FileBarChart2,
  FileText,
  Gauge,
  History,
  Landmark,
  LayoutDashboard,
  ListTree,
  Lock,
  type LucideIcon,
  Percent,
  Plug,
  Settings,
  ShieldAlert,
  Sparkles,
  Table2,
  User,
  UserRound,
} from "lucide-react";

export type NavBadgeKey = "customers" | "cases";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Pass in which the destination screen is built. */
  pass: 1 | 2;
  badge?: NavBadgeKey;
  /** Additional path prefixes that mark this item active. */
  activePrefixes?: readonly string[];
}

export interface NavSection {
  id: string;
  label: string;
  items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard, pass: 1 },
      {
        id: "customers",
        label: "Customers",
        href: "/customers",
        icon: Building2,
        pass: 2,
        badge: "customers",
      },
      {
        id: "profiles",
        label: "Financial Profiles",
        href: "/profiles",
        icon: UserRound,
        pass: 1,
        activePrefixes: ["/profiles"],
      },
      {
        id: "cases",
        label: "Analysis Cases",
        href: "/cases",
        icon: ClipboardList,
        pass: 2,
        badge: "cases",
        activePrefixes: ["/cases"],
      },
      { id: "reports", label: "Analysis Reports", href: "/reports", icon: FileBarChart2, pass: 2 },
      { id: "accounts", label: "Account Explorer", href: "/accounts", icon: Landmark, pass: 2 },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    items: [
      {
        id: "categories",
        label: "Transaction Categories",
        href: "/config/categories",
        icon: Table2,
        pass: 2,
      },
      { id: "rules", label: "Classification Rules", href: "/config/rules", icon: ListTree, pass: 2 },
      { id: "income", label: "Income Recognition", href: "/config/income", icon: Sparkles, pass: 2 },
      { id: "metrics", label: "Metrics & Ratios", href: "/config/metrics", icon: Percent, pass: 2 },
      {
        id: "risk-indicators",
        label: "Risk Indicators",
        href: "/config/risk-indicators",
        icon: ShieldAlert,
        pass: 2,
      },
      { id: "scoring", label: "Scoring Models", href: "/config/scoring", icon: Gauge, pass: 2 },
      { id: "templates", label: "Analysis Templates", href: "/config/templates", icon: FileText, pass: 2 },
      { id: "benchmarks", label: "Peer Benchmarks", href: "/config/benchmarks", icon: BarChart3, pass: 2 },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { id: "users", label: "Users", href: "/admin/users", icon: User, pass: 2 },
      { id: "roles", label: "Roles & Permissions", href: "/admin/roles", icon: Lock, pass: 2 },
      { id: "integrations", label: "Integrations", href: "/admin/integrations", icon: Plug, pass: 2 },
      { id: "audit", label: "Audit Trail", href: "/admin/audit", icon: History, pass: 2 },
      { id: "settings", label: "General Settings", href: "/admin/settings", icon: Settings, pass: 2 },
    ],
  },
];

export const ALL_NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function findNavItemByPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find(
    (i) => pathname === i.href || (i.activePrefixes ?? []).some((p) => pathname.startsWith(p)),
  );
}

export const APP_META = {
  version: "v2.4.0-proto",
  build: "Build 2026.11.05 · IN-WEST",
  environment: "UAT",
  tenantCode: "NUC-APAC-01",
} as const;
