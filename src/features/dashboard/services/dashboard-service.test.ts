import { describe } from "vitest";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { DashboardFiltersSchema, LiquidityQuerySchema, WorkQueueQuerySchema } from "../schemas/dashboard";
import { dashboardServiceContract } from "./dashboard-service.contract";
import { DASHBOARD_ENDPOINTS } from "./endpoints";
import { createHttpDashboardService } from "./http-dashboard-service";
import { createMockDashboardService } from "./mock-dashboard-service";

const mock = () => createMockDashboardService(createMockRuntime({ latencyMs: [0, 0] }));

describe("DashboardService contract — mock adapter", () => dashboardServiceContract(mock));

describe("DashboardService contract — http adapter (in-memory server)", () =>
  dashboardServiceContract(() => {
    const backend = mock();
    const fetchImpl = createInMemoryFetch([
      {
        method: "GET",
        path: DASHBOARD_ENDPOINTS.overview,
        handler: ({ query }) =>
          backend.getOverview(
            DashboardFiltersSchema.parse({
              periodDays: Number(query.get("periodDays")),
              segment: query.get("segment"),
              region: query.get("region"),
              analyst: query.get("analyst"),
            }),
          ),
      },
      {
        method: "GET",
        path: DASHBOARD_ENDPOINTS.liquidity,
        handler: ({ query }) =>
          backend.getLiquidity(
            LiquidityQuerySchema.parse({ group: query.get("group"), currency: query.get("currency") }),
          ),
      },
      {
        method: "POST",
        path: DASHBOARD_ENDPOINTS.workQueue,
        handler: ({ body }) => backend.getWorkQueue(WorkQueueQuerySchema.parse(body)),
      },
    ]);
    return createHttpDashboardService(createHttpClient("http://test/api/v1", fetchImpl));
  }));
