"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { CustomerContextSchema, type CustomerContext } from "../schemas/cases";

const FIELDS = [
  { name: "customerType", label: "Customer type" },
  { name: "sector", label: "Sector" },
  { name: "regionCountry", label: "Region · country" },
  { name: "reportingCurrency", label: "Reporting currency" },
  { name: "analysisPeriod", label: "Analysis period" },
  { name: "expectedAccounts", label: "Expected accounts" },
  { name: "declaredTurnover", label: "Declared turnover" },
  { name: "linkedFsaCase", label: "Linked FSA case" },
] as const;

export function ContextPanel({
  context,
  onSave,
  saving,
}: {
  context: CustomerContext;
  onSave: (c: CustomerContext) => void;
  saving: boolean;
}) {
  const form = useForm<CustomerContext>({ resolver: zodResolver(CustomerContextSchema), values: context });
  const dirty = form.formState.isDirty;
  return (
    <Panel
      title="Customer Context"
      actions={
        <Chip tone={dirty ? "warning" : "positive"} variant="outline" dot>
          {dirty ? "Edited" : "Confirmed"}
        </Chip>
      }
    >
      <form onSubmit={form.handleSubmit((v) => onSave({ ...v, confirmed: true }))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => {
            const err = form.formState.errors[f.name];
            return (
              <label key={f.name} className="block">
                <span className="label-micro text-[10px]">{f.label}</span>
                <span className="relative mt-1 block">
                  <input
                    {...form.register(f.name, f.name === "expectedAccounts" ? { valueAsNumber: true } : {})}
                    type={f.name === "expectedAccounts" ? "number" : "text"}
                    aria-invalid={err ? true : undefined}
                    className="h-10 w-full rounded-lg border border-border-strong bg-surface-2 px-3 pr-8 text-sm text-fg outline-none focus:border-info"
                  />
                  <Pencil
                    className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                </span>
                {err ? <span className="text-xs text-negative">{err.message}</span> : null}
              </label>
            );
          })}
        </div>
        <p className="rounded-lg border border-info/40 bg-info/5 px-3 py-2.5 text-[13px] text-fg">
          Template <strong className="num">{context.template.id}</strong> · {context.template.name} ·{" "}
          {context.template.note}
        </p>
        {dirty ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => form.reset(context)}>
              Discard
            </Button>
            <Button size="sm" variant="info" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Confirm context"}
            </Button>
          </div>
        ) : null}
      </form>
    </Panel>
  );
}
