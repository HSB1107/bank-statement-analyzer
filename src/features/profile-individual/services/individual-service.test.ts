import { describe } from "vitest";
import { createAuditLog } from "@/shared/data/audit-log";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { createHttpIndividualService } from "./http-individual-service";
import { individualServiceContract } from "./individual-service.contract";
import { createMockIndividualService } from "./mock-individual-service";

const mock = () => createMockIndividualService(createMockRuntime({ latencyMs: [0, 0] }), createAuditLog());
const id = (p: Record<string, string>) => CustomerIdSchema.parse(p.id);

describe("IndividualProfileService contract — mock adapter", () => individualServiceContract(mock));
describe("IndividualProfileService contract — http adapter (in-memory server)", () =>
  individualServiceContract(() => {
    const b = mock();
    return createHttpIndividualService(
      createHttpClient(
        "http://test/api/v1",
        createInMemoryFetch([
          {
            method: "GET",
            path: "/profiles/individual/:id/header",
            handler: ({ params }) => b.getHeader(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/individual/:id/overview",
            handler: ({ params }) => b.getOverview(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/individual/:id/income",
            handler: ({ params }) => b.getIncome(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/individual/:id/liquidity",
            handler: ({ params }) => b.getLiquidity(id(params)),
          },
          {
            method: "GET",
            path: "/profiles/individual/:id/obligations",
            handler: ({ params }) => b.getObligations(id(params)),
          },
          {
            method: "POST",
            path: "/profiles/individual/:id/final",
            handler: ({ params }) => b.saveFinal(id(params)),
          },
        ]),
      ),
    );
  }));
