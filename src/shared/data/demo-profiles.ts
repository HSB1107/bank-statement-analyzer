import { healthBandFor, type HealthBand } from "./schemas/case";
import { ARJUN_ICICI, getArjunDataset } from "./generators/arjun";
import { meridianInput } from "./meridian-input";
import { individualMetrics, scoreIndividual, type IndividualMetrics } from "./scoring/individual-model";
import { corporateMetrics, scoreCorporate, type CorporateMetrics } from "./scoring/corporate-model";
import { type IndividualInput } from "./selectors/individual";

/** Memoised analytics for the two Pass-1 demo customers (shared by mock adapters). */
let arjun: {
  input: IndividualInput;
  metrics: IndividualMetrics;
  score: ReturnType<typeof scoreIndividual>;
} | null = null;
let meridian: { metrics: CorporateMetrics; score: ReturnType<typeof scoreCorporate> } | null = null;

export function arjunAnalytics() {
  if (arjun) return arjun;
  const ds = getArjunDataset();
  const input: IndividualInput = {
    transactions: ds.transactions,
    accounts: ds.accounts,
    period: ds.customer.period,
    primaryAccountId: ARJUN_ICICI,
    lowBalanceThresholdMinor: 10_000_00,
    policyFoir: 0.5,
  };
  const metrics = individualMetrics(input);
  arjun = { input, metrics, score: scoreIndividual(metrics) };
  return arjun;
}

export function meridianAnalytics() {
  if (meridian) return meridian;
  const metrics = corporateMetrics(meridianInput());
  meridian = { metrics, score: scoreCorporate(metrics) };
  return meridian;
}

export function demoCaseHealth(caseId: string): { score: number; band: HealthBand } | null {
  if (caseId === "BSA-26-04417") {
    const s = arjunAnalytics().score.score;
    return { score: s, band: healthBandFor(s) };
  }
  if (caseId === "BSA-26-04421") {
    const s = meridianAnalytics().score.score;
    return { score: s, band: healthBandFor(s) };
  }
  return null;
}
