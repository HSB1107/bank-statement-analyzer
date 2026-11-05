"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { type DashboardFilters, type LiquidityQuery, type WorkQueueQuery } from "../schemas/dashboard";
import { DashboardServiceToken } from "../services/dashboard-service";

export function useDashboardOverview(filters: DashboardFilters) {
  const svc = useService(DashboardServiceToken);
  return useQuery({
    queryKey: ["dashboard", "overview", filters],
    queryFn: () => svc.getOverview(filters),
    placeholderData: keepPreviousData,
  });
}

export function useLiquidity(query: LiquidityQuery) {
  const svc = useService(DashboardServiceToken);
  return useQuery({
    queryKey: ["dashboard", "liquidity", query],
    queryFn: () => svc.getLiquidity(query),
    placeholderData: keepPreviousData,
  });
}

export function useWorkQueue(query: WorkQueueQuery) {
  const svc = useService(DashboardServiceToken);
  return useQuery({
    queryKey: ["dashboard", "queue", query],
    queryFn: () => svc.getWorkQueue(query),
    placeholderData: keepPreviousData,
  });
}
