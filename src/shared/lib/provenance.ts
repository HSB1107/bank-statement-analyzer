import { z } from "zod";

/**
 * Every metric shown is tagged with where it came from:
 * FACT (read from a statement row), DERIVED (computed), AI (model interpretation),
 * INVESTIGATE (needs underwriter follow-up).
 */
export const ProvenanceSchema = z.enum(["FACT", "DERIVED", "AI", "INVESTIGATE"]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** The six confidence dimensions are always reported separately — never collapsed. */
export const ConfidenceDimensionSchema = z.enum([
  "ocr",
  "extraction",
  "classification",
  "counterparty",
  "completeness",
  "aiInterpretation",
]);
export type ConfidenceDimension = z.infer<typeof ConfidenceDimensionSchema>;

export const CONFIDENCE_DIMENSION_LABELS: Readonly<Record<ConfidenceDimension, string>> = {
  ocr: "OCR confidence",
  extraction: "Transaction extraction",
  classification: "Classification",
  counterparty: "Counterparty ID",
  completeness: "Metric data completeness",
  aiInterpretation: "AI interpretation",
};

const ratio = z.number().min(0).max(1);

export const ConfidenceFrameworkSchema = z.object({
  ocr: z.object({ value: ratio, note: z.string() }),
  extraction: z.object({ value: ratio, note: z.string() }),
  classification: z.object({ value: ratio, note: z.string() }),
  counterparty: z.object({ value: ratio, note: z.string() }),
  completeness: z.object({ value: ratio, note: z.string() }),
  aiInterpretation: z.object({ value: ratio, note: z.string() }),
});
export type ConfidenceFramework = z.infer<typeof ConfidenceFrameworkSchema>;
