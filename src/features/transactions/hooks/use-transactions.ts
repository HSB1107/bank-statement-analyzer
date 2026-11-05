"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { type CaseId, type TransactionId } from "@/shared/data/schemas/ids";
import { type TxnActionRequest, type TxnFilter } from "../schemas/transactions";
import { TransactionServiceToken } from "../services/transaction-service";

export function useReviewSummary(caseId: CaseId) {
  const svc = useService(TransactionServiceToken);
  return useQuery({ queryKey: ["txn", caseId, "summary"], queryFn: () => svc.getSummary(caseId) });
}

export function useTransactions(caseId: CaseId, filter: TxnFilter | null) {
  const svc = useService(TransactionServiceToken);
  return useQuery({
    queryKey: ["txn", caseId, "list", filter],
    queryFn: () => (filter ? svc.list(caseId, filter) : Promise.reject(new Error("no filter"))),
    enabled: filter !== null,
    placeholderData: keepPreviousData,
  });
}

export function useTransactionDetail(caseId: CaseId, id: TransactionId | null) {
  const svc = useService(TransactionServiceToken);
  return useQuery({
    queryKey: ["txn", caseId, "detail", id],
    queryFn: () => (id ? svc.getDetail(caseId, id) : Promise.reject(new Error("no id"))),
    enabled: id !== null,
  });
}

export function useReviewActions(caseId: CaseId) {
  const svc = useService(TransactionServiceToken);
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["txn", caseId] });
  return {
    apply: useMutation({
      mutationFn: (v: { id: TransactionId; request: TxnActionRequest }) =>
        svc.applyAction(caseId, v.id, v.request),
      onSuccess: invalidate,
    }),
    acceptAll: useMutation({ mutationFn: () => svc.acceptAllAbove(caseId, 0.95), onSuccess: invalidate }),
    approve: useMutation({ mutationFn: () => svc.approve(caseId), onSuccess: invalidate }),
  };
}
