"use client";

import { AlertTriangle, Cpu, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type CaseId } from "@/shared/data/schemas/ids";
import { Button } from "@/shared/ui/button";
import { ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { useCase, useIngestion, useIngestionActions } from "../hooks/use-cases";
import { CaseFrame } from "./case-frame";
import { ContextPanel } from "./context-panel";
import { CoveragePanel } from "./coverage-panel";
import { MappingPanel } from "./mapping-panel";
import { OptionsPanel } from "./options-panel";
import { UploadPanel } from "./upload-panel";
import { ValidationPanel } from "./validation-panel";

export function IngestionScreen({ caseId }: { caseId: CaseId }) {
  const q = useIngestion(caseId);
  const c = useCase(caseId);
  const actions = useIngestionActions(caseId);
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const i = q.data;

  return (
    <CaseFrame caseId={caseId} step="upload">
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !i ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <PanelSkeleton rows={8} />
          <PanelSkeleton rows={8} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-4">
              <UploadPanel
                files={i.files}
                accounts={i.mapping.length}
                removingId={actions.removeFile.isPending ? (actions.removeFile.variables ?? null) : null}
                onAdd={(files) =>
                  files.forEach((f) =>
                    actions.addFile.mutate(f, {
                      onSuccess: (r) =>
                        setNotice(
                          r.status.kind === "unrecognised"
                            ? `${r.name}: bank not recognised — map manually.`
                            : `${r.name}: identified as ${r.detected?.bankName ?? ""} XXXX${r.detected?.last4 ?? ""}.`,
                        ),
                    }),
                  )
                }
                onRemove={(id) => actions.removeFile.mutate(id)}
              />
              <MappingPanel
                ingestion={i}
                corporate={c.data?.kind === "corporate"}
                onRole={(accountId, role) => actions.setRole.mutate({ accountId, role })}
              />
              <OptionsPanel
                options={i.options}
                onChange={(id, v) => actions.updateOptions.mutate({ [id]: v })}
              />
            </div>
            <div className="space-y-4">
              <ContextPanel
                context={i.context}
                saving={actions.updateContext.isPending}
                onSave={(ctx) => actions.updateContext.mutate(ctx)}
              />
              <CoveragePanel coverage={i.coverage} />
              <ValidationPanel checks={i.validation} />
            </div>
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {notice}
          </p>
          <div className="sticky bottom-0 z-20 -mx-4 bg-bg/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-surface px-4 py-3">
              {i.coverageWarning ? (
                <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-muted">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <strong className="text-warning">Coverage incomplete:</strong> {i.coverageWarning}
                  </span>
                </p>
              ) : (
                <p className="flex-1 text-sm text-positive">
                  All expected statements present — completeness 100%.
                </p>
              )}
              <Button onClick={() => setNotice("Draft saved.")}>Save as Draft</Button>
              <Button
                variant="info"
                onClick={() =>
                  actions.validate.mutate(undefined, {
                    onSuccess: (v) =>
                      setNotice(
                        `Validation complete: ${v.filter((x) => x.severity !== "ok").length} items need attention.`,
                      ),
                  })
                }
                disabled={actions.validate.isPending}
              >
                <ShieldCheck aria-hidden />{" "}
                {actions.validate.isPending ? "Validating…" : "Validate Documents"}
              </Button>
              <Button
                variant="primary"
                disabled={actions.start.isPending}
                onClick={() =>
                  actions.start.mutate(undefined, {
                    onSuccess: () => router.push(`/cases/${caseId}/processing`),
                  })
                }
              >
                <Cpu aria-hidden /> {actions.start.isPending ? "Starting…" : "Start AI Processing"}
              </Button>
            </div>
            {notice ? <p className="mt-1 text-right text-xs text-muted">{notice}</p> : null}
          </div>
        </div>
      )}
    </CaseFrame>
  );
}
