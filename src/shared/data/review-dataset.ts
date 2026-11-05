import { getArjunDataset } from "./generators/arjun";
import { getMeridianDataset, MERIDIAN_SBI } from "./generators/meridian";
import { type Account } from "./schemas/customer";
import { type Transaction } from "./schemas/transaction";

/** Resolve a demo case to its ledger (shared by mock adapters). */
export function caseLedger(caseId: string): {
  corporate: boolean;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  missingMonths: Readonly<Record<string, readonly number[]>>;
  customerId: string;
} {
  if (caseId === "BSA-26-04421") {
    const ds = getMeridianDataset();
    return {
      corporate: true,
      accounts: ds.accounts,
      transactions: ds.transactions,
      missingMonths: { [MERIDIAN_SBI]: [ds.sbiMissingMonth] },
      customerId: ds.customer.id,
    };
  }
  if (caseId === "BSA-26-04417") {
    const ds = getArjunDataset();
    return {
      corporate: false,
      accounts: ds.accounts,
      transactions: ds.transactions,
      missingMonths: {},
      customerId: ds.customer.id,
    };
  }
  throw new Error(`Case ${caseId} is not part of the Pass 1 demo (coming in Pass 2).`);
}
