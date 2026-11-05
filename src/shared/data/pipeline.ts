/** The 21-stage AI pipeline definition (shared by login stats, processing and dashboard). */
export const PIPELINE_STAGE_DEFS = [
  { id: "ingestion", name: "Document ingestion" },
  { id: "integrity", name: "File integrity validation" },
  { id: "identification", name: "Bank & account identification" },
  { id: "ocr", name: "OCR & transaction extraction" },
  { id: "parsing", name: "Transaction row parsing" },
  { id: "normalisation", name: "Date & amount normalisation" },
  { id: "drcr", name: "Debit / credit identification" },
  { id: "enrichment", name: "Description enrichment" },
  { id: "categorisation", name: "Transaction categorisation" },
  { id: "counterparty", name: "Counterparty identification" },
  { id: "duplicates", name: "Duplicate transaction detection" },
  { id: "transfers", name: "Internal transfer identification" },
  { id: "recurring_income", name: "Recurring income identification" },
  { id: "recurring_payments", name: "Recurring payment identification" },
  { id: "obligations", name: "Financial obligation detection" },
  { id: "cashflow", name: "Cash-flow aggregation" },
  { id: "liquidity", name: "Liquidity analysis" },
  { id: "anomaly", name: "Anomaly detection" },
  { id: "signals", name: "Risk signal generation" },
  { id: "profile", name: "Financial profile computation" },
  { id: "report", name: "Financial report generation" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGE_DEFS)[number]["id"];
