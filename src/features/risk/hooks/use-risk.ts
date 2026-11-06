"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { type CaseId, type SignalId } from "@/shared/data/schemas/ids";
import { type SignalAction } from "../schemas/risk";
import { RiskServiceToken } from "../services/risk-service";

const key = (caseId: CaseId) => ["risk", caseId] as const;

export function useRiskWorkspace(caseId: CaseId) {
  const svc = useService(RiskServiceToken);
  return useQuery({ queryKey: key(caseId), queryFn: () => svc.getWorkspace(caseId) });
}

export function useSignalAction(caseId: CaseId) {
  const svc = useService(RiskServiceToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { signalId: SignalId; action: SignalAction }) =>
      svc.applyAction(caseId, v.signalId, v.action),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(caseId) }),
  });
}

/** Active (non-false-positive) signal count for a profile tab badge; undefined while loading. */
export function useRiskBadge(caseId: CaseId): number | undefined {
  return useRiskWorkspace(caseId).data?.activeCount;
}
