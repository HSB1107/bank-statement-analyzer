import { type HttpClient } from "@/shared/lib/http-client";
import { ProcessingEventSchema, ProcessingPlanSchema } from "../schemas/processing";
import { type ProcessingService } from "./processing-service";
import { PROCESSING_ENDPOINTS } from "./endpoints";

/** HTTP adapter: events arrive as Server-Sent Events, each `data:` payload a JSON ProcessingEvent. */
export function createHttpProcessingService(http: HttpClient): ProcessingService {
  return {
    getPlan: (caseId) => http.get(PROCESSING_ENDPOINTS.plan(caseId), ProcessingPlanSchema),
    async *stream(caseId, options) {
      for await (const data of http.stream(PROCESSING_ENDPOINTS.events(caseId), {
        signal: options?.signal,
      })) {
        yield ProcessingEventSchema.parse(JSON.parse(data));
      }
    },
  };
}
