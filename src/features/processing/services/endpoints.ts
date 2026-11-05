export const PROCESSING_ENDPOINTS = {
  plan: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/processing/plan`,
  events: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/processing/events`,
} as const;
