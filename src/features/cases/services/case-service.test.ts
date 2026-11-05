import { describe } from "vitest";
import { createAuditLog } from "@/shared/data/audit-log";
import {
  AccountIdSchema,
  CaseIdSchema,
  CustomerIdSchema,
  StatementFileIdSchema,
} from "@/shared/data/schemas/ids";
import { AccountRoleSchema } from "@/shared/data/schemas/customer";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { AddFileRequestSchema, CustomerContextSchema, ProcessingOptionsPatchSchema } from "../schemas/cases";
import { caseServiceContract } from "./case-service.contract";
import { createHttpCaseService } from "./http-case-service";
import { createMockCaseService } from "./mock-case-service";
import { z } from "zod";

const mock = () => createMockCaseService(createMockRuntime({ latencyMs: [0, 0] }), createAuditLog());
const id = (p: Record<string, string>) => CaseIdSchema.parse(p.caseId);

describe("CaseService contract — mock adapter", () => caseServiceContract(mock));

describe("CaseService contract — http adapter (in-memory server)", () =>
  caseServiceContract(() => {
    const b = mock();
    const fetchImpl = createInMemoryFetch([
      { method: "GET", path: "/customers/profiles", handler: () => b.listProfiles() },
      {
        method: "GET",
        path: "/customers/:customerId",
        handler: ({ params }) => b.getCustomer(CustomerIdSchema.parse(params.customerId)),
      },
      { method: "GET", path: "/cases/:caseId", handler: ({ params }) => b.getCase(id(params)) },
      {
        method: "GET",
        path: "/cases/:caseId/ingestion",
        handler: ({ params }) => b.getIngestion(id(params)),
      },
      {
        method: "POST",
        path: "/cases/:caseId/files",
        handler: ({ params, body }) => b.addFile(id(params), AddFileRequestSchema.parse(body)),
      },
      {
        method: "POST",
        path: "/cases/:caseId/files/remove",
        handler: ({ params, body }) =>
          b
            .removeFile(
              id(params),
              StatementFileIdSchema.parse(z.object({ fileId: z.string() }).parse(body).fileId),
            )
            .then(() => ({})),
      },
      {
        method: "PATCH",
        path: "/cases/:caseId/context",
        handler: ({ params, body }) => b.updateContext(id(params), CustomerContextSchema.parse(body)),
      },
      {
        method: "PATCH",
        path: "/cases/:caseId/accounts/role",
        handler: ({ params, body }) => {
          const p = z.object({ accountId: z.string(), role: AccountRoleSchema }).parse(body);
          return b.setAccountRole(id(params), AccountIdSchema.parse(p.accountId), p.role).then(() => ({}));
        },
      },
      {
        method: "PATCH",
        path: "/cases/:caseId/options",
        handler: ({ params, body }) => b.updateOptions(id(params), ProcessingOptionsPatchSchema.parse(body)),
      },
      { method: "POST", path: "/cases/:caseId/validate", handler: ({ params }) => b.validate(id(params)) },
      {
        method: "POST",
        path: "/cases/:caseId/processing",
        handler: ({ params }) => b.startProcessing(id(params)),
      },
    ]);
    return createHttpCaseService(createHttpClient("http://test/api/v1", fetchImpl));
  }));
