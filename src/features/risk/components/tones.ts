import { type Severity, type SignalStatus } from "@/shared/data/schemas/signal";
import { type Tone } from "@/shared/ui/tone";

export const SEVERITY_TONE: Readonly<Record<Severity, Tone>> = {
  critical: "negative",
  high: "warning",
  medium: "magenta",
  low: "info",
};

/** Screen 11: Investigate amber, Open grey, Acknowledged cyan, Resolved green, False positive grey. */
export const STATUS_TONE: Readonly<Record<SignalStatus, Tone>> = {
  investigate: "warning",
  open: "neutral",
  acknowledged: "info",
  resolved: "positive",
  false_positive: "neutral",
};
