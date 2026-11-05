"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { CorporateProfileServiceToken } from "../services/corporate-service";

const key = (id: CustomerId, part: string) => ["profile", "corporate", id, part] as const;

export function useCorporateHeader(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  return useQuery({ queryKey: key(id, "header"), queryFn: () => svc.getHeader(id) });
}
export function useCorporateOverview(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  return useQuery({ queryKey: key(id, "overview"), queryFn: () => svc.getOverview(id) });
}
export function useCorporateInflows(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  return useQuery({ queryKey: key(id, "inflows"), queryFn: () => svc.getInflows(id) });
}
export function useCorporateLiquidity(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  return useQuery({ queryKey: key(id, "liquidity"), queryFn: () => svc.getLiquidity(id) });
}
export function useFundFlow(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  return useQuery({ queryKey: key(id, "fundflow"), queryFn: () => svc.getFundFlow(id) });
}
export function useSaveCorporate(id: CustomerId) {
  const svc = useService(CorporateProfileServiceToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.saveFinal(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(id, "header") }),
  });
}
export function useRefreshCorporate(id: CustomerId) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["profile", "corporate", id] });
}
