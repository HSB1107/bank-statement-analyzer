import { describe } from "vitest";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createHttpClient } from "@/shared/lib/http-client";
import { createHttpProcessingService } from "./http-processing-service";
import { createMockProcessingService } from "./mock-processing-service";
import { processingServiceContract } from "./processing-service.contract";

const mock = () => createMockProcessingService(createMockRuntime({ latencyMs: [0, 0] }));

describe("ProcessingService contract — mock adapter", () => processingServiceContract(mock));

/** SSE server simulation: serialises the mock's events as `data:` frames. */
function sseFetch(): typeof fetch {
  const backend = mock();
  return async (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    );
    const caseId = CaseIdSchema.parse(decodeURIComponent(url.pathname.split("/")[4] ?? ""));
    if (url.pathname.endsWith("/plan"))
      return new Response(JSON.stringify(await backend.getPlan(caseId)), { status: 200 });
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        for await (const e of backend.stream(caseId, { speed: 100_000 }))
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
}

describe("ProcessingService contract — http adapter (SSE)", () =>
  processingServiceContract(() =>
    createHttpProcessingService(createHttpClient("http://test/api/v1", sseFetch())),
  ));
