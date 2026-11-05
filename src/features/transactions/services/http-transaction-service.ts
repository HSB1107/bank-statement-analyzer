import { type HttpClient } from "@/shared/lib/http-client";
import {
  BulkResultSchema,
  ReviewSummarySchema,
  TxnDetailSchema,
  TxnPageSchema,
} from "../schemas/transactions";
import { type TransactionService } from "./transaction-service";
import { TRANSACTION_ENDPOINTS } from "./endpoints";

/** HTTP adapter. TODO(backend): switch `list` to cursor paging once the API supports it (table is virtualised). */
export function createHttpTransactionService(http: HttpClient): TransactionService {
  return {
    getSummary: (c) => http.get(TRANSACTION_ENDPOINTS.summary(c), ReviewSummarySchema),
    list: (c, filter) => http.post(TRANSACTION_ENDPOINTS.list(c), filter, TxnPageSchema),
    getDetail: (c, id) => http.get(TRANSACTION_ENDPOINTS.detail(c, id), TxnDetailSchema),
    applyAction: (c, id, req) => http.post(TRANSACTION_ENDPOINTS.action(c, id), req, TxnDetailSchema),
    acceptAllAbove: (c, threshold) =>
      http.post(TRANSACTION_ENDPOINTS.acceptAll(c), { threshold }, BulkResultSchema),
    approve: (c) => http.post(TRANSACTION_ENDPOINTS.approve(c), {}, BulkResultSchema),
  };
}
