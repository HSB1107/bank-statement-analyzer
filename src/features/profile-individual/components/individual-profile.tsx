"use client";

import { type ReactNode } from "react";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { Breadcrumbs } from "@/shared/layout/breadcrumbs";
import { Pass2Placeholder } from "@/shared/layout/pass2-placeholder";
import { ProfileHeader } from "@/shared/layout/profile-header";
import { TabNav } from "@/shared/layout/tab-nav";
import { ErrorState, PanelSkeleton, Skeleton } from "@/shared/ui/states";
import {
  useIndividualHeader,
  useIndividualIncome,
  useIndividualLiquidity,
  useIndividualObligations,
  useIndividualOverview,
  useRefreshIndividual,
  useSaveIndividual,
} from "../hooks/use-individual";
import { IncomeTab } from "./income-tab";
import { LiquidityTab } from "./liquidity-tab";
import { ObligationsTab } from "./obligations-tab";
import { OverviewTab } from "./overview-tab";

/** Tabs are configuration: id, label, and whether Pass 1 builds them. */
export const INDIVIDUAL_TABS = [
  { id: "overview", label: "Overview", pass: 1 },
  { id: "income", label: "Income", pass: 1 },
  { id: "expenditure", label: "Expenditure", pass: 2 },
  { id: "liquidity", label: "Liquidity", pass: 1 },
  { id: "obligations", label: "Obligations & Debt", pass: 1 },
  { id: "behaviour", label: "Transaction Behaviour", pass: 2 },
  { id: "risk", label: "AI Risk Signals", pass: 1 },
  { id: "report", label: "Report", pass: 2 },
] as const;

function TabBody<T>({
  q,
  render,
}: {
  q: { data: T | undefined; isError: boolean; error: unknown; refetch: () => unknown };
  render: (d: T) => ReactNode;
}) {
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PanelSkeleton rows={8} />;
  return <>{render(q.data)}</>;
}

function OverviewBody({ id }: { id: CustomerId }) {
  return <TabBody q={useIndividualOverview(id)} render={(d) => <OverviewTab data={d} />} />;
}
function IncomeBody({ id }: { id: CustomerId }) {
  return <TabBody q={useIndividualIncome(id)} render={(d) => <IncomeTab data={d} />} />;
}
function LiquidityBody({ id }: { id: CustomerId }) {
  return <TabBody q={useIndividualLiquidity(id)} render={(d) => <LiquidityTab data={d} />} />;
}
function ObligationsBody({ id }: { id: CustomerId }) {
  return <TabBody q={useIndividualObligations(id)} render={(d) => <ObligationsTab data={d} />} />;
}

export function IndividualProfile({
  customerId,
  tab,
  riskSlot,
}: {
  customerId: CustomerId;
  tab: string;
  riskSlot: ReactNode;
}) {
  const header = useIndividualHeader(customerId);
  const save = useSaveIndividual(customerId);
  const refresh = useRefreshIndividual(customerId);
  const def = INDIVIDUAL_TABS.find((t) => t.id === tab);
  const h = header.data;
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Financial Profiles", href: "/profiles" },
          { label: h?.name ?? "…" },
          { label: def?.label ?? "Overview" },
        ]}
      />
      {header.isError ? (
        <ErrorState error={header.error} onRetry={() => void header.refetch()} />
      ) : h ? (
        <ProfileHeader data={h} onRefresh={refresh} onSave={() => save.mutate()} saving={save.isPending} />
      ) : (
        <Skeleton className="mb-4 h-40" />
      )}
      <TabNav
        label="Profile sections"
        activeId={def?.id ?? "overview"}
        items={INDIVIDUAL_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          href: `/profiles/${customerId}/${t.id}`,
          badge: t.id === "risk" && h ? h.openSignals : undefined,
        }))}
      />
      {!def || def.pass === 2 ? (
        <Pass2Placeholder
          title={def?.label ?? "Unknown tab"}
          description="This profile tab is part of Pass 2."
          links={[{ label: "Overview", href: `/profiles/${customerId}/overview` }]}
        />
      ) : def.id === "overview" ? (
        <OverviewBody id={customerId} />
      ) : def.id === "income" ? (
        <IncomeBody id={customerId} />
      ) : def.id === "liquidity" ? (
        <LiquidityBody id={customerId} />
      ) : def.id === "obligations" ? (
        <ObligationsBody id={customerId} />
      ) : (
        riskSlot
      )}
    </div>
  );
}
