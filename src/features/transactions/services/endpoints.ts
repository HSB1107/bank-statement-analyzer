export const TRANSACTION_ENDPOINTS = {
  summary: (c: string) => `/cases/${encodeURIComponent(c)}/transactions/summary`,
  list: (c: string) => `/cases/${encodeURIComponent(c)}/transactions/search`,
  detail: (c: string, id: string) => `/cases/${encodeURIComponent(c)}/transactions/${encodeURIComponent(id)}`,
  action: (c: string, id: string) =>
    `/cases/${encodeURIComponent(c)}/transactions/${encodeURIComponent(id)}/actions`,
  acceptAll: (c: string) => `/cases/${encodeURIComponent(c)}/transactions/accept-all`,
  approve: (c: string) => `/cases/${encodeURIComponent(c)}/transactions/approve`,
} as const;
