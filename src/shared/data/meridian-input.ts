import { getMeridianDataset, MERIDIAN_SBI } from "./generators/meridian";
import { type CorporateInput } from "./selectors/corporate";

/** Selector input for Meridian (shared by mocks and tests). */
export function meridianInput(): CorporateInput {
  const ds = getMeridianDataset();
  return {
    transactions: ds.transactions,
    accounts: ds.accounts,
    period: ds.customer.period,
    missingMonths: { [MERIDIAN_SBI]: [ds.sbiMissingMonth] },
    lowBalanceThresholdMinor: 50_00_000_00,
  };
}
