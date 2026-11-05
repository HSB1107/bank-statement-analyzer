"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { IndividualProfileServiceToken } from "../services/individual-service";

const key = (id: CustomerId, part: string) => ["profile", "individual", id, part] as const;

export function useIndividualHeader(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  return useQuery({ queryKey: key(id, "header"), queryFn: () => svc.getHeader(id) });
}
export function useIndividualOverview(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  return useQuery({ queryKey: key(id, "overview"), queryFn: () => svc.getOverview(id) });
}
export function useIndividualIncome(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  return useQuery({ queryKey: key(id, "income"), queryFn: () => svc.getIncome(id) });
}
export function useIndividualLiquidity(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  return useQuery({ queryKey: key(id, "liquidity"), queryFn: () => svc.getLiquidity(id) });
}
export function useIndividualObligations(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  return useQuery({ queryKey: key(id, "obligations"), queryFn: () => svc.getObligations(id) });
}
export function useSaveIndividual(id: CustomerId) {
  const svc = useService(IndividualProfileServiceToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.saveFinal(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(id, "header") }),
  });
}
export function useRefreshIndividual(id: CustomerId) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["profile", "individual", id] });
}
