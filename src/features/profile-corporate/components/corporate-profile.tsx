"use client";

import { type ReactNode } from "react";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { Breadcrumbs } from "@/shared/layout/breadcrumbs";
import { Pass2Placeholder } from "@/shared/layout/pass2-placeholder";
import { ProfileHeader } from "@/shared/layout/profile-header";
import { TabNav } from "@/shared/layout/tab-nav";
import { ErrorState, PanelSkeleton, Skeleton } from "@/shared/ui/states";
import {
  useCorporateHeader,
  useCorporateInflows,
  useCorporateLiquidity,
  useCorporateOverview,
  useFundFlow,
  useRefreshCorporate,
  useSaveCorporate,
} from "../hooks/use-corporate";
import { FundFlowTab } from "./fund-flow-tab";
import { InflowsTab } from "./inflows-tab";
import { CorporateLiquidityTab } from "./liquidity-tab";
import { CorporateOverviewTab } from "./overview-tab";
import { CORPORATE_TABS } from "./tabs";

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
  return <TabBody q={useCorporateOverview(id)} render={(d) => <CorporateOverviewTab data={d} />} />;
}
function InflowsBody({ id }: { id: CustomerId }) {
  return <TabBody q={useCorporateInflows(id)} render={(d) => <InflowsTab data={d} />} />;
}
function LiquidityBody({ id }: { id: CustomerId }) {
  return <TabBody q={useCorporateLiquidity(id)} render={(d) => <CorporateLiquidityTab data={d} />} />;
}
function FundFlowBody({ id, caseId }: { id: CustomerId; caseId: string | undefined }) {
  const links = {
    transactions: caseId ? `/cases/${caseId}/transactions` : "/profiles",
    risk: `/profiles/${id}/risk`,
  };
  return <TabBody q={useFundFlow(id)} render={(d) => <FundFlowTab data={d} links={links} />} />;
}

export function CorporateProfile({
  customerId,
  tab,
  riskSlot,
  riskBadge,
}: {
  customerId: CustomerId;
  tab: string;
  riskSlot: ReactNode;
  /** Live active-signal count from the risk feature; falls back to the header's snapshot. */
  riskBadge?: number;
}) {
  const header = useCorporateHeader(customerId);
  const save = useSaveCorporate(customerId);
  const refresh = useRefreshCorporate(customerId);
  const def = CORPORATE_TABS.find((t) => t.id === tab);
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
        items={CORPORATE_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          href: `/profiles/${customerId}/${t.id}`,
          badge: t.id === "risk" ? (riskBadge ?? h?.openSignals) : undefined,
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
      ) : def.id === "inflows" ? (
        <InflowsBody id={customerId} />
      ) : def.id === "liquidity" ? (
        <LiquidityBody id={customerId} />
      ) : def.id === "fundflow" ? (
        <FundFlowBody id={customerId} caseId={h?.caseId} />
      ) : (
        riskSlot
      )}
    </div>
  );
}
