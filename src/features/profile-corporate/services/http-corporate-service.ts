import { type HttpClient } from "@/shared/lib/http-client";
import { ProfileHeaderSchema, SaveProfileResultSchema } from "@/shared/data/schemas/profile";
import {
  CorporateLiquiditySchema,
  CorporateOverviewSchema,
  FundFlowSchema,
  InflowAnalysisSchema,
} from "../schemas/corporate";
import { type CorporateProfileService } from "./corporate-service";
import { CORPORATE_ENDPOINTS } from "./endpoints";

/** HTTP adapter. TODO(backend): fund-flow graph may need server-side grouping thresholds as query params. */
export function createHttpCorporateService(http: HttpClient): CorporateProfileService {
  return {
    getHeader: (id) => http.get(CORPORATE_ENDPOINTS.header(id), ProfileHeaderSchema),
    getOverview: (id) => http.get(CORPORATE_ENDPOINTS.overview(id), CorporateOverviewSchema),
    getInflows: (id) => http.get(CORPORATE_ENDPOINTS.inflows(id), InflowAnalysisSchema),
    getLiquidity: (id) => http.get(CORPORATE_ENDPOINTS.liquidity(id), CorporateLiquiditySchema),
    getFundFlow: (id) => http.get(CORPORATE_ENDPOINTS.fundFlow(id), FundFlowSchema),
    saveFinal: (id) => http.post(CORPORATE_ENDPOINTS.save(id), {}, SaveProfileResultSchema),
  };
}
