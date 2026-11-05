"use client";

import { type ReactNode } from "react";
import { type CaseId } from "@/shared/data/schemas/ids";
import { Breadcrumbs } from "@/shared/layout/breadcrumbs";
import { CaseHeader } from "@/shared/layout/case-header";
import { Stepper } from "@/shared/layout/stepper";
import { ErrorState, Skeleton } from "@/shared/ui/states";
import { WORKFLOW_STEPS, type CaseDetail, type WorkflowStepId } from "../schemas/cases";
import { useCase } from "../hooks/use-cases";

const stageLabel = (id: WorkflowStepId): string => WORKFLOW_STEPS.find((s) => s.id === id)?.label ?? id;

function stepHref(c: CaseDetail, step: WorkflowStepId): string | undefined {
  switch (step) {
    case "upload":
      return `/cases/${c.id}/ingestion`;
    case "processing":
      return `/cases/${c.id}/processing`;
    case "validation":
      return `/cases/${c.id}/transactions`;
    case "profiling":
    case "review":
      return `/profiles/${c.customerId}/overview`;
    default:
      return undefined;
  }
}

/** Breadcrumb + case header + workflow stepper shared by the case workspace screens. */
export function CaseFrame({
  caseId,
  step,
  children,
}: {
  caseId: CaseId;
  step: WorkflowStepId;
  children: ReactNode;
}) {
  const q = useCase(caseId);
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const c = q.data;
  const current = WORKFLOW_STEPS.findIndex((s) => s.id === step);
  return (
    <div className="space-y-0">
      <Breadcrumbs
        items={[
          { label: "Analysis Cases", href: "/cases" },
          { label: c ? c.customerName.replace(/ Pvt\. Ltd\.$/, "") : "…" },
          { label: caseId },
        ]}
      />
      {c ? (
        <CaseHeader
          data={{
            caseId: c.id,
            customerName: c.customerName,
            customerRef: c.customerRef,
            facts: [
              { label: "Region", value: c.regionLabel },
              { label: "Purpose", value: c.purpose },
              { label: "Period", value: c.periodLabel },
              { label: "Accounts", value: String(c.accounts) },
            ],
            stage: stageLabel(step),
          }}
        />
      ) : (
        <Skeleton className="mb-4 h-20" />
      )}
      <Stepper
        steps={WORKFLOW_STEPS.map((s) => ({
          id: s.id,
          label: s.label,
          href: c ? stepHref(c, s.id) : undefined,
        }))}
        currentIndex={current}
      />
      {children}
    </div>
  );
}
