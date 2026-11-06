/** Profile tabs as configuration (plain module so routes can enumerate them at build time). */
export const INDIVIDUAL_TABS = [
  { id: "overview", label: "Overview", pass: 1 },
  { id: "income", label: "Income", pass: 1 },
  { id: "expenditure", label: "Expenditure", pass: 2 },
  { id: "liquidity", label: "Liquidity", pass: 1 },
  { id: "obligations", label: "Obligations & Debt", pass: 1 },
  { id: "behaviour", label: "Transaction Behaviour", pass: 2 },
  { id: "risk", label: "AI Risk Signals", pass: 1 },
  { id: "report", label: "Report", pass: 2 },
] as const;
