import { createServiceToken } from "@/shared/lib/di";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { type ProfileHeader } from "@/shared/data/schemas/profile";
import {
  type IncomeAnalysis,
  type IndividualOverview,
  type LiquidityAnalysis,
  type ObligationsAnalysis,
} from "../schemas/individual";

/** Port: individual (retail) financial profile. */
export interface IndividualProfileService {
  getHeader(customerId: CustomerId): Promise<ProfileHeader>;
  getOverview(customerId: CustomerId): Promise<IndividualOverview>;
  getIncome(customerId: CustomerId): Promise<IncomeAnalysis>;
  getLiquidity(customerId: CustomerId): Promise<LiquidityAnalysis>;
  getObligations(customerId: CustomerId): Promise<ObligationsAnalysis>;
  saveFinal(customerId: CustomerId): Promise<{ savedAt: string }>;
}

export const IndividualProfileServiceToken =
  createServiceToken<IndividualProfileService>("IndividualProfileService");
