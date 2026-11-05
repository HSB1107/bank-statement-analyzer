import { describe } from "vitest";
import { createAuditLog } from "@/shared/data/audit-log";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { corporateServiceContract } from "./corporate-service.contract";
import { createHttpCorporateService } from "./http-corporate-service";
import { createMockCorporateService } from "./mock-corporate-service";

const mock = () => createMockCorporateService(createMockRuntime({ latencyMs: [0, 0] }), createAuditLog());
const id = (p: Record<string, string>) => CustomerIdSchema.parse(p.id);

describe("CorporateProfileService contract — mock adapter", () => corporateServiceContract(mock));
describe("CorporateProfileService contract — http adapter (in-memory server)", () =>
  corporateServiceContract(() => {
    const b = mock();
    return createHttpCorporateService(
      createHttpClient(
        "http://test/api/v1",
        createInMemoryFetch([
          {
            method: "GET",
            path: "/profiles/corporate/:id/header",
            handler: ({ params }) => b.getHeader(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/corporate/:id/overview",
            handler: ({ params }) => b.getOverview(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/corporate/:id/inflows",
            handler: ({ params }) => b.getInflows(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/corporate/:id/liquidity",
            handler: ({ params }) => b.getLiquidity(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/corporate/:id/fund-flow",
            handler: ({ params }) => b.getFundFlow(id(params)),
          },
          {
            method: "POST",
            path: "/profiles/corporate/:id/final",
            handler: ({ params }) => b.saveFinal(id(params)),
          },
        ]),
      ),
    );
  }));
