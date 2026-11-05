"use client";

import Link from "next/link";
import { useCustomer, useProfiles } from "@/features/cases";
import { IndividualProfile } from "@/features/profile-individual";
import { assertNever } from "@/shared/lib/assert";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { Breadcrumbs, PageHeading } from "@/shared/layout/breadcrumbs";
import { Pass2Placeholder } from "@/shared/layout/pass2-placeholder";
import { Chip, SyntheticBadge } from "@/shared/ui/chip";
import { ErrorState, PanelSkeleton } from "@/shared/ui/states";

/** Switches the profile screen by customer kind (individual | corporate). */
export function ProfileRoute({ customerId, tab }: { customerId: CustomerId; tab: string }) {
  const customer = useCustomer(customerId);
  if (customer.isError)
    return (
      <Pass2Placeholder
        title="Financial profile"
        description={customer.error instanceof Error ? customer.error.message : undefined}
      />
    );
  if (!customer.data) return <PanelSkeleton rows={10} />;
  const kind = customer.data.kind;
  switch (kind) {
    case "individual":
      return (
        <IndividualProfile
          customerId={customerId}
          tab={tab}
          riskSlot={<Pass2Placeholder title="AI Risk Signals" />}
        />
      );
    case "corporate":
      return <Pass2Placeholder title="Corporate profile" description="Wired in phase 7." />;
    default:
      return assertNever(kind, "customer kind");
  }
}

export function ProfilesIndex() {
  const q = useProfiles();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Workspace" }, { label: "Financial Profiles" }]} />
      <PageHeading
        title="Financial Profiles"
        subtitle="Pass 1 demo profiles — every figure computed from each customer's seeded transaction set."
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <PanelSkeleton rows={3} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.map((c) => (
            <li key={c.customerId}>
              <Link
                href={`/profiles/${c.customerId}/overview`}
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card transition-colors hover:border-info/60"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-fg">{c.name}</span>
                  <Chip tone={c.kind === "corporate" ? "lime" : "info"} variant="outline" mono size="xs">
                    {c.kind}
                  </Chip>
                  <SyntheticBadge />
                </span>
                <span className="num mt-1 block text-sm text-muted">
                  {c.customerId} · {c.caseId}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
