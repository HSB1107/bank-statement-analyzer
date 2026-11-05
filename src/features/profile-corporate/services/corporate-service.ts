import { createServiceToken } from "@/shared/lib/di";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { type ProfileHeader } from "@/shared/data/schemas/profile";
import {
  type CorporateLiquidity,
  type CorporateOverview,
  type FundFlow,
  type InflowAnalysis,
} from "../schemas/corporate";

/** Port: corporate (SME) financial profile. */
export interface CorporateProfileService {
  getHeader(customerId: CustomerId): Promise<ProfileHeader>;
  getOverview(customerId: CustomerId): Promise<CorporateOverview>;
  getInflows(customerId: CustomerId): Promise<InflowAnalysis>;
  getLiquidity(customerId: CustomerId): Promise<CorporateLiquidity>;
  getFundFlow(customerId: CustomerId): Promise<FundFlow>;
  saveFinal(customerId: CustomerId): Promise<{ savedAt: string }>;
}

export const CorporateProfileServiceToken =
  createServiceToken<CorporateProfileService>("CorporateProfileService");
