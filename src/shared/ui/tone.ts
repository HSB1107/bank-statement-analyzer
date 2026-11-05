import { z } from "zod";

/** Semantic colour tones. Every coloured element maps to a token through these. */
export const ToneSchema = z.enum([
  "positive",
  "negative",
  "warning",
  "info",
  "magenta",
  "lime",
  "indigo",
  "neutral",
]);
export type Tone = z.infer<typeof ToneSchema>;

export const TONE_TEXT: Readonly<Record<Tone, string>> = {
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  info: "text-info",
  magenta: "text-magenta",
  lime: "text-lime",
  indigo: "text-indigo",
  neutral: "text-muted",
};

export const TONE_BG: Readonly<Record<Tone, string>> = {
  positive: "bg-positive",
  negative: "bg-negative",
  warning: "bg-warning",
  info: "bg-info",
  magenta: "bg-magenta",
  lime: "bg-lime",
  indigo: "bg-indigo",
  neutral: "bg-neutral",
};

export const TONE_SOFT: Readonly<Record<Tone, string>> = {
  positive: "bg-positive/12 text-positive border-positive/40",
  negative: "bg-negative/12 text-negative border-negative/40",
  warning: "bg-warning/12 text-warning border-warning/40",
  info: "bg-info/12 text-info border-info/40",
  magenta: "bg-magenta/12 text-magenta border-magenta/40",
  lime: "bg-lime/12 text-lime border-lime/40",
  indigo: "bg-indigo/12 text-indigo border-indigo/40",
  neutral: "bg-neutral/12 text-muted border-border-strong",
};

export const TONE_BORDER: Readonly<Record<Tone, string>> = {
  positive: "border-positive",
  negative: "border-negative",
  warning: "border-warning",
  info: "border-info",
  magenta: "border-magenta",
  lime: "border-lime",
  indigo: "border-indigo",
  neutral: "border-border-strong",
};

/** CSS variable for charts / inline SVG fills. */
export const TONE_VAR: Readonly<Record<Tone, string>> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  warning: "var(--warning)",
  info: "var(--info)",
  magenta: "var(--magenta)",
  lime: "var(--lime)",
  indigo: "var(--indigo)",
  neutral: "var(--neutral)",
};
