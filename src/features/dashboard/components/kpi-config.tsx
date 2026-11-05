import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardList,
  Clock,
  Eye,
  FileStack,
  Landmark,
} from "lucide-react";
import { type ReactNode } from "react";
import { formatCount } from "@/shared/lib/format";
import { type KpiId } from "../schemas/dashboard";

/** Data-driven KPI card definitions for the dashboard (order = display order). */
export interface DashboardKpiDef {
  id: KpiId;
  label: string;
  icon: ReactNode;
  format: (v: number) => string;
  unit?: string;
  /** Whether an increase is good, bad or a watch item. */
  polarity: "up_good" | "up_watch" | "up_bad" | "down_good";
  highlight?: boolean;
}

export const DASHBOARD_KPIS: readonly DashboardKpiDef[] = [
  {
    id: "customersAnalysed",
    label: "Customers Analysed",
    icon: <Building2 className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_good",
  },
  {
    id: "bankAccounts",
    label: "Bank Accounts",
    icon: <Landmark className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_good",
  },
  {
    id: "analysisCases",
    label: "Analysis Cases",
    icon: <ClipboardList className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_good",
  },
  {
    id: "statementsQueued",
    label: "Statements Queued",
    icon: <FileStack className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_watch",
  },
  {
    id: "awaitingReview",
    label: "Awaiting Review",
    icon: <Eye className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_watch",
  },
  {
    id: "profilesGenerated",
    label: "Profiles Generated",
    icon: <Activity className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_good",
  },
  {
    id: "criticalSignals",
    label: "Critical Signals",
    icon: <AlertTriangle className="size-3.5" aria-hidden />,
    format: formatCount,
    polarity: "up_bad",
    highlight: true,
  },
  {
    id: "avgProcessingMinutes",
    label: "Avg Processing",
    icon: <Clock className="size-3.5" aria-hidden />,
    format: (v) => v.toFixed(1),
    unit: "min",
    polarity: "down_good",
  },
];
