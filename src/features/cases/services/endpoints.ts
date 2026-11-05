export const CASE_ENDPOINTS = {
  customer: (customerId: string) => `/customers/${encodeURIComponent(customerId)}`,
  profiles: "/customers/profiles",
  detail: (caseId: string) => `/cases/${encodeURIComponent(caseId)}`,
  ingestion: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/ingestion`,
  files: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/files`,
  removeFile: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/files/remove`,
  context: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/context`,
  accountRole: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/accounts/role`,
  options: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/options`,
  validate: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/validate`,
  start: (caseId: string) => `/cases/${encodeURIComponent(caseId)}/processing`,
} as const;
