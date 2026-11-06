import { describe } from "vitest";
import { createAuditLog } from "@/shared/data/audit-log";
import { CaseIdSchema, SignalIdSchema } from "@/shared/data/schemas/ids";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { SignalActionSchema } from "../schemas/risk";
import { createHttpRiskService } from "./http-risk-service";
import { createMockRiskService } from "./mock-risk-service";
import { riskServiceContract } from "./risk-service.contract";

const mock = () => createMockRiskService(createMockRuntime({ latencyMs: [0, 0] }), createAuditLog());

describe("RiskService contract — mock adapter", () => riskServiceContract(mock));
describe("RiskService contract — http adapter (in-memory server)", () =>
  riskServiceContract(() => {
    const b = mock();
    return createHttpRiskService(
      createHttpClient(
        "http://test/api/v1",
        createInMemoryFetch([
          {
            method: "GET",
            path: "/cases/:caseId/risk",
            handler: ({ params }) => b.getWorkspace(CaseIdSchema.parse(params.caseId)),
          },
          {
            method: "POST",
            path: "/cases/:caseId/risk/signals/:signalId/actions",
            handler: ({ params, body }) =>
              b.applyAction(
                CaseIdSchema.parse(params.caseId),
                SignalIdSchema.parse(params.signalId),
                SignalActionSchema.parse(body),
              ),
          },
        ]),
      ),
    );
  }));
