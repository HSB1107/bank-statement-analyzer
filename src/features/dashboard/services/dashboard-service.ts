import { createServiceToken } from "@/shared/lib/di";
import {
  type DashboardFilters,
  type DashboardOverview,
  type LiquidityQuery,
  type LiquiditySnapshot,
  type WorkQueuePage,
  type WorkQueueQuery,
} from "../schemas/dashboard";

/** Port: portfolio-level analytics for the Executive Dashboard. */
export interface DashboardService {
  getOverview(filters: DashboardFilters): Promise<DashboardOverview>;
  getLiquidity(query: LiquidityQuery): Promise<LiquiditySnapshot>;
  getWorkQueue(query: WorkQueueQuery): Promise<WorkQueuePage>;
}

export const DashboardServiceToken = createServiceToken<DashboardService>("DashboardService");
