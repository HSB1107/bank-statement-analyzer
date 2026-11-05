import { type HttpClient } from "@/shared/lib/http-client";
import { ProfileHeaderSchema, SaveProfileResultSchema } from "@/shared/data/schemas/profile";
import {
  IncomeAnalysisSchema,
  IndividualOverviewSchema,
  LiquidityAnalysisSchema,
  ObligationsAnalysisSchema,
} from "../schemas/individual";
import { type IndividualProfileService } from "./individual-service";
import { INDIVIDUAL_ENDPOINTS } from "./endpoints";

/** HTTP adapter. TODO(backend): profile tabs may be served from one /profile payload; keep per-tab for lazy loading. */
export function createHttpIndividualService(http: HttpClient): IndividualProfileService {
  return {
    getHeader: (id) => http.get(INDIVIDUAL_ENDPOINTS.header(id), ProfileHeaderSchema),
    getOverview: (id) => http.get(INDIVIDUAL_ENDPOINTS.overview(id), IndividualOverviewSchema),
    getIncome: (id) => http.get(INDIVIDUAL_ENDPOINTS.income(id), IncomeAnalysisSchema),
    getLiquidity: (id) => http.get(INDIVIDUAL_ENDPOINTS.liquidity(id), LiquidityAnalysisSchema),
    getObligations: (id) => http.get(INDIVIDUAL_ENDPOINTS.obligations(id), ObligationsAnalysisSchema),
    saveFinal: (id) => http.post(INDIVIDUAL_ENDPOINTS.save(id), {}, SaveProfileResultSchema),
  };
}
