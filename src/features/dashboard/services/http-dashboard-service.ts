import { type HttpClient } from "@/shared/lib/http-client";
import {
  DashboardOverviewSchema,
  LiquiditySnapshotSchema,
  WorkQueuePageSchema,
  WorkQueueQuerySchema,
} from "../schemas/dashboard";
import { type DashboardService } from "./dashboard-service";
import { DASHBOARD_ENDPOINTS } from "./endpoints";

/** HTTP adapter. TODO(backend): confirm query-param names and server-side paging for the queue. */
export function createHttpDashboardService(http: HttpClient): DashboardService {
  return {
    getOverview: (f) =>
      http.get(DASHBOARD_ENDPOINTS.overview, DashboardOverviewSchema, {
        periodDays: f.periodDays,
        segment: f.segment,
        region: f.region,
        analyst: f.analyst,
      }),
    getLiquidity: (q) =>
      http.get(DASHBOARD_ENDPOINTS.liquidity, LiquiditySnapshotSchema, {
        group: q.group,
        currency: q.currency,
      }),
    getWorkQueue: (q) =>
      http.post(DASHBOARD_ENDPOINTS.workQueue, WorkQueueQuerySchema.parse(q), WorkQueuePageSchema),
  };
}
