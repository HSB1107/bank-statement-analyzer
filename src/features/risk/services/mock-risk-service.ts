import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { type CaseId, type SignalId } from "@/shared/data/schemas/ids";
import { SIGNAL_STATUS_LABELS, type SignalStatus } from "@/shared/data/schemas/signal";
import { CLOSED_STATUSES, SignalActionSchema, type SignalAction } from "../schemas/risk";
import { type RiskService } from "./risk-service";
import { buildWorkspace, caseSignals, type TriageState } from "./risk-vm";

const ACTOR = "Priya Raman";
const ACTOR_SHORT = "P. Raman";

const NEXT_STATUS: Readonly<Record<Exclude<SignalAction["type"], "assign" | "comment">, SignalStatus>> = {
  acknowledge: "acknowledged",
  investigate: "investigate",
  false_positive: "false_positive",
  resolve: "resolved",
};

export function createMockRiskService(runtime: MockRuntime, audit: AuditLog): RiskService {
  const states = new Map<string, Map<string, TriageState>>();
  const stateFor = (caseId: CaseId) => {
    let s = states.get(caseId);
    if (!s) {
      s = new Map();
      states.set(caseId, s);
    }
    return s;
  };

  return {
    async getWorkspace(caseId) {
      await runtime.delay();
      runtime.maybeFail("risk workspace");
      return buildWorkspace(caseId, stateFor(caseId), audit);
    },

    async applyAction(caseId: CaseId, signalId: SignalId, raw: SignalAction) {
      await runtime.delay();
      const action = SignalActionSchema.parse(raw);
      const base = caseSignals(caseId).find((s) => s.id === signalId);
      if (!base) throw new Error(`Signal ${signalId} not found on case ${caseId}`);
      const state = stateFor(caseId);
      const cur: TriageState = state.get(signalId) ?? { status: base.status, owner: base.owner };

      if (action.type !== "comment" && CLOSED_STATUSES.includes(cur.status))
        throw new Error(
          `${signalId} is ${SIGNAL_STATUS_LABELS[cur.status].toLowerCase()} — only commentary can be added.`,
        );

      let next: TriageState = cur;
      let entry: { action: string; before: string | null; after: string | null; reason: string };
      switch (action.type) {
        case "comment":
          entry = { action: "COMMENT", before: null, after: action.text, reason: "Underwriter commentary" };
          break;
        case "assign":
          next = { ...cur, owner: action.owner };
          entry = {
            action: "ASSIGN",
            before: cur.owner,
            after: action.owner,
            reason: `Assigned to ${action.owner}`,
          };
          break;
        case "acknowledge":
        case "investigate":
        case "false_positive":
        case "resolve": {
          const status = NEXT_STATUS[action.type];
          next = { status, owner: cur.owner ?? (action.type === "investigate" ? ACTOR_SHORT : null) };
          entry = {
            action: `STATUS_${status.toUpperCase()}`,
            before: SIGNAL_STATUS_LABELS[cur.status],
            after: SIGNAL_STATUS_LABELS[status],
            reason:
              "reason" in action ? action.reason : `Marked ${SIGNAL_STATUS_LABELS[status].toLowerCase()}`,
          };
          break;
        }
      }
      state.set(signalId, next);
      audit.append({ actor: ACTOR, entity: "signal", entityId: signalId, ...entry });

      const view = buildWorkspace(caseId, state, audit).signals.find((s) => s.id === signalId);
      if (!view) throw new Error(`Signal ${signalId} disappeared`);
      return view;
    },
  };
}
