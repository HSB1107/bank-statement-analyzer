"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import {
  type AccountId,
  type CaseId,
  type CustomerId,
  type StatementFileId,
} from "@/shared/data/schemas/ids";
import { type AccountRole } from "@/shared/data/schemas/customer";
import { type AddFileRequest, type CustomerContext, type ProcessingOptionsPatch } from "../schemas/cases";
import { CaseServiceToken } from "../services/case-service";

const keys = {
  detail: (id: CaseId) => ["case", id] as const,
  ingestion: (id: CaseId) => ["case", id, "ingestion"] as const,
};

export function useCase(caseId: CaseId) {
  const svc = useService(CaseServiceToken);
  return useQuery({ queryKey: keys.detail(caseId), queryFn: () => svc.getCase(caseId) });
}

export function useCustomer(customerId: CustomerId) {
  const svc = useService(CaseServiceToken);
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => svc.getCustomer(customerId),
    staleTime: Infinity,
  });
}

export function useProfiles() {
  const svc = useService(CaseServiceToken);
  return useQuery({
    queryKey: ["customer", "profiles"],
    queryFn: () => svc.listProfiles(),
    staleTime: Infinity,
  });
}

export function useIngestion(caseId: CaseId) {
  const svc = useService(CaseServiceToken);
  return useQuery({ queryKey: keys.ingestion(caseId), queryFn: () => svc.getIngestion(caseId) });
}

/** Mutations invalidate the ingestion view so derived coverage/validation refresh. */
function useCaseMutation<V, R>(caseId: CaseId, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useIngestionActions(caseId: CaseId) {
  const svc = useService(CaseServiceToken);
  return {
    addFile: useCaseMutation(caseId, (f: AddFileRequest) => svc.addFile(caseId, f)),
    removeFile: useCaseMutation(caseId, (id: StatementFileId) => svc.removeFile(caseId, id)),
    updateContext: useCaseMutation(caseId, (c: CustomerContext) => svc.updateContext(caseId, c)),
    setRole: useCaseMutation(caseId, (v: { accountId: AccountId; role: AccountRole }) =>
      svc.setAccountRole(caseId, v.accountId, v.role),
    ),
    updateOptions: useCaseMutation(caseId, (o: ProcessingOptionsPatch) => svc.updateOptions(caseId, o)),
    validate: useCaseMutation(caseId, () => svc.validate(caseId)),
    start: useCaseMutation(caseId, () => svc.startProcessing(caseId)),
  };
}
