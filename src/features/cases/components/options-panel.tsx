"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Panel } from "@/shared/ui/panel";
import { Switch } from "@/shared/ui/switch";
import {
  ProcessingOptionIdSchema,
  ProcessingOptionsSchema,
  type ProcessingOptionId,
  type ProcessingOptions,
} from "../schemas/cases";

const LABELS: Readonly<Record<ProcessingOptionId, string>> = {
  ocr: "OCR & text extraction",
  classification: "Transaction classification",
  income: "Income identification",
  expenses: "Expense categorisation",
  transfers: "Internal transfer identification",
  recurring: "Recurring obligation detection",
  counterparty: "Counterparty identification",
  liquidity: "Liquidity analysis",
  cashflow: "Cash-flow analysis",
  anomaly: "Anomaly detection",
  signals: "Risk signal generation",
  scoring: "Financial health scoring",
};

export function OptionsPanel({
  options,
  onChange,
}: {
  options: ProcessingOptions;
  onChange: (id: ProcessingOptionId, value: boolean) => void;
}) {
  const form = useForm<ProcessingOptions>({
    resolver: zodResolver(ProcessingOptionsSchema),
    values: options,
  });
  const on = ProcessingOptionIdSchema.options.filter((id) => options[id]).length;
  return (
    <Panel title="Processing Options" meta={`${on} of ${ProcessingOptionIdSchema.options.length} on`}>
      <ul className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
        {ProcessingOptionIdSchema.options.map((id) => (
          <li key={id} className="flex items-center justify-between border-b border-border/60 py-2">
            <label htmlFor={`opt-${id}`} className="text-sm text-fg">
              {LABELS[id]}
            </label>
            <Controller
              control={form.control}
              name={id}
              render={({ field }) => (
                <Switch
                  id={`opt-${id}`}
                  checked={field.value}
                  onCheckedChange={(v) => {
                    field.onChange(v);
                    onChange(id, v);
                  }}
                />
              )}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
