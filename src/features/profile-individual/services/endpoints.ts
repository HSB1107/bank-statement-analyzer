const base = (id: string) => `/profiles/individual/${encodeURIComponent(id)}`;
export const INDIVIDUAL_ENDPOINTS = {
  header: (id: string) => `${base(id)}/header`,
  overview: (id: string) => `${base(id)}/overview`,
  income: (id: string) => `${base(id)}/income`,
  liquidity: (id: string) => `${base(id)}/liquidity`,
  obligations: (id: string) => `${base(id)}/obligations`,
  save: (id: string) => `${base(id)}/final`,
} as const;
