import { createServiceToken } from "@/shared/lib/di";
import { type CaseId, type TransactionId } from "@/shared/data/schemas/ids";
import {
  type ReviewSummary,
  type TxnActionRequest,
  type TxnDetail,
  type TxnFilter,
  type TxnPage,
} from "../schemas/transactions";

/** Port: human-in-the-loop transaction review. Originals are immutable; actions create audited overrides. */
export interface TransactionService {
  getSummary(caseId: CaseId): Promise<ReviewSummary>;
  list(caseId: CaseId, filter: TxnFilter): Promise<TxnPage>;
  getDetail(caseId: CaseId, id: TransactionId): Promise<TxnDetail>;
  applyAction(caseId: CaseId, id: TransactionId, request: TxnActionRequest): Promise<TxnDetail>;
  acceptAllAbove(caseId: CaseId, threshold: number): Promise<{ affected: number }>;
  approve(caseId: CaseId): Promise<{ affected: number }>;
}

export const TransactionServiceToken = createServiceToken<TransactionService>("TransactionService");
