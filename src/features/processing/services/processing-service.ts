import { createServiceToken } from "@/shared/lib/di";
import { type CaseId } from "@/shared/data/schemas/ids";
import { type ProcessingEvent, type ProcessingPlan } from "../schemas/processing";

export interface StreamOptions {
  /** Playback speed multiplier for the simulated job (mock only). */
  speed?: number;
  signal?: AbortSignal;
}

/** Port: AI processing job. `stream` is an async iterator so the mock can be swapped for SSE. */
export interface ProcessingService {
  getPlan(caseId: CaseId): Promise<ProcessingPlan>;
  stream(caseId: CaseId, options?: StreamOptions): AsyncIterable<ProcessingEvent>;
}

export const ProcessingServiceToken = createServiceToken<ProcessingService>("ProcessingService");
