import { createServiceToken } from "@/shared/lib/di";
import { type CaseId, type SignalId } from "@/shared/data/schemas/ids";
import { type RiskWorkspace, type SignalAction, type SignalView } from "../schemas/risk";

/**
 * Port: AI risk intelligence for a case. Signals support the underwriter's judgement; every
 * triage action (acknowledge, investigate, assign, comment, false positive, resolve) is audited.
 */
export interface RiskService {
  getWorkspace(caseId: CaseId): Promise<RiskWorkspace>;
  applyAction(caseId: CaseId, signalId: SignalId, action: SignalAction): Promise<SignalView>;
}

export const RiskServiceToken = createServiceToken<RiskService>("RiskService");
