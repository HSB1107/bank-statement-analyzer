const base = (caseId: string) => `/cases/${encodeURIComponent(caseId)}/risk`;

export const RISK_ENDPOINTS = {
  workspace: (caseId: string) => base(caseId),
  action: (caseId: string, signalId: string) =>
    `${base(caseId)}/signals/${encodeURIComponent(signalId)}/actions`,
} as const;
