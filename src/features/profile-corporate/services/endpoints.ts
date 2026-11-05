const base = (id: string) => `/profiles/corporate/${encodeURIComponent(id)}`;
export const CORPORATE_ENDPOINTS = {
  header: (id: string) => `${base(id)}/header`,
  overview: (id: string) => `${base(id)}/overview`,
  inflows: (id: string) => `${base(id)}/inflows`,
  liquidity: (id: string) => `${base(id)}/liquidity`,
  fundFlow: (id: string) => `${base(id)}/fund-flow`,
  save: (id: string) => `${base(id)}/final`,
} as const;
