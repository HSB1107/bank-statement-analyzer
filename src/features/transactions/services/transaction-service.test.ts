import { describe } from "vitest";
import { z } from "zod";
import { createAuditLog } from "@/shared/data/audit-log";
import { CaseIdSchema, TransactionIdSchema } from "@/shared/data/schemas/ids";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { TxnActionRequestSchema, TxnFilterSchema } from "../schemas/transactions";
import { createHttpTransactionService } from "./http-transaction-service";
import { createMockTransactionService } from "./mock-transaction-service";
import { transactionServiceContract } from "./transaction-service.contract";

const mock = () => createMockTransactionService(createMockRuntime({ latencyMs: [0, 0] }), createAuditLog());
const c = (p: Record<string, string>) => CaseIdSchema.parse(p.caseId);
const t = (p: Record<string, string>) => TransactionIdSchema.parse(p.id);

describe("TransactionService contract — mock adapter", () => transactionServiceContract(mock));

describe("TransactionService contract — http adapter (in-memory server)", () =>
  transactionServiceContract(() => {
    const b = mock();
    const fetchImpl = createInMemoryFetch([
      {
        method: "GET",
        path: "/cases/:caseId/transactions/summary",
        handler: ({ params }) => b.getSummary(c(params)),
      },
      {
        method: "POST",
        path: "/cases/:caseId/transactions/search",
        handler: ({ params, body }) => b.list(c(params), TxnFilterSchema.parse(body)),
      },
      {
        method: "POST",
        path: "/cases/:caseId/transactions/accept-all",
        handler: ({ params, body }) =>
          b.acceptAllAbove(c(params), z.object({ threshold: z.number() }).parse(body).threshold),
      },
      {
        method: "POST",
        path: "/cases/:caseId/transactions/approve",
        handler: ({ params }) => b.approve(c(params)),
      },
      {
        method: "GET",
        path: "/cases/:caseId/transactions/:id",
        handler: ({ params }) => b.getDetail(c(params), t(params)),
      },
      {
        method: "POST",
        path: "/cases/:caseId/transactions/:id/actions",
        handler: ({ params, body }) =>
          b.applyAction(c(params), t(params), TxnActionRequestSchema.parse(body)),
      },
    ]);
    return createHttpTransactionService(createHttpClient("http://test/api/v1", fetchImpl));
  }));
