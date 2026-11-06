import { type HttpClient } from "@/shared/lib/http-client";
import { RiskWorkspaceSchema, SignalActionSchema, SignalViewSchema } from "../schemas/risk";
import { RISK_ENDPOINTS } from "./endpoints";
import { type RiskService } from "./risk-service";

/** HTTP adapter. Actions are validated client-side too, so a bad request never leaves the browser. */
export function createHttpRiskService(http: HttpClient): RiskService {
  return {
    getWorkspace: (caseId) => http.get(RISK_ENDPOINTS.workspace(caseId), RiskWorkspaceSchema),
    applyAction: async (caseId, signalId, action) =>
      http.post(RISK_ENDPOINTS.action(caseId, signalId), SignalActionSchema.parse(action), SignalViewSchema),
  };
}
