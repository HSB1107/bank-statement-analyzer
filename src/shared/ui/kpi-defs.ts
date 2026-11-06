import { type Provenance } from "@/shared/lib/provenance";
import { type KpiItem } from "./kpi-card";
import { type Tone } from "./tone";

/** A KPI card defined as data over a view model. */
export interface KpiDef<VM> {
  id: string;
  label: string;
  provenance?: Provenance;
  tone?: Tone | ((vm: VM) => Tone);
  accent?: Tone;
  value: (vm: VM) => string;
  unit?: string;
  caption?: (vm: VM) => string;
}

export function renderKpis<VM>(defs: readonly KpiDef<VM>[], vm: VM): KpiItem[] {
  return defs.map((d) => ({
    id: d.id,
    label: d.label,
    provenance: d.provenance,
    tone: typeof d.tone === "function" ? d.tone(vm) : d.tone,
    accent: d.accent,
    value: d.value(vm),
    unit: d.unit,
    caption: d.caption?.(vm),
  }));
}
