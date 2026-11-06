/** Profile tabs as configuration (plain module so routes can enumerate them at build time). */
export const CORPORATE_TABS = [
  { id: "overview", label: "Overview", pass: 1 },
  { id: "inflows", label: "Business Inflows", pass: 1 },
  { id: "outflows", label: "Business Outflows", pass: 2 },
  { id: "liquidity", label: "Liquidity", pass: 1 },
  { id: "cashflow", label: "Cash Flow & WC", pass: 2 },
  { id: "debt", label: "Debt & Financing", pass: 2 },
  { id: "fundflow", label: "Fund Flow", pass: 1 },
  { id: "risk", label: "AI Risk Signals", pass: 1 },
  { id: "report", label: "Report", pass: 2 },
] as const;
