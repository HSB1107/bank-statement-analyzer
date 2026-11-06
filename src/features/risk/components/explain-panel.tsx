"use client";

import { useId, useState, type FormEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { SIGNAL_STATUS_LABELS } from "@/shared/data/schemas/signal";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { ProvenanceTag } from "@/shared/ui/provenance-tag";
import { FilterSelect } from "@/shared/ui/select";
import {
  ANALYSTS,
  CLOSED_STATUSES,
  SignalActionSchema,
  type SignalAction,
  type SignalView,
} from "../schemas/risk";
import { SEVERITY_TONE, STATUS_TONE } from "./tones";

type FormMode = "assign" | "comment" | "false_positive" | "resolve" | null;

const FORM_COPY: Readonly<
  Record<Exclude<FormMode, null>, { title: string; submit: string; placeholder: string }>
> = {
  assign: { title: "Assign to analyst", submit: "Assign", placeholder: "" },
  comment: {
    title: "Add commentary",
    submit: "Add commentary",
    placeholder: "What did you check, and what did you find?",
  },
  false_positive: {
    title: "Mark false positive",
    submit: "Mark false positive",
    placeholder: "Why is this not a real risk? (kept in the audit trail)",
  },
  resolve: {
    title: "Resolve signal",
    submit: "Resolve",
    placeholder: "How was this resolved? (kept in the audit trail)",
  },
};

export function ExplainPanel({
  signal,
  pending,
  error,
  onAction,
}: {
  signal: SignalView;
  pending: boolean;
  error: string | null;
  onAction: (action: SignalAction) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<FormMode>(null);
  const [text, setText] = useState("");
  const [owner, setOwner] = useState<string>(signal.owner ?? ANALYSTS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const textId = useId();
  const errId = useId();
  const closed = CLOSED_STATUSES.includes(signal.status);

  const open = (m: FormMode) => {
    setMode(m);
    setText("");
    setFormError(null);
  };

  const run = async (action: SignalAction) => {
    const parsed = SignalActionSchema.safeParse(action);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    try {
      await onAction(parsed.data);
      setMode(null);
      setText("");
      setFormError(null);
    } catch {
      // Server error is surfaced through `error`.
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "assign") void run({ type: "assign", owner });
    else if (mode === "comment") void run({ type: "comment", text });
    else if (mode === "false_positive") void run({ type: "false_positive", reason: text });
    else if (mode === "resolve") void run({ type: "resolve", reason: text });
  };

  return (
    <Panel
      highlight={SEVERITY_TONE[signal.severity]}
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Chip tone={SEVERITY_TONE[signal.severity]} variant="solid" mono size="xs">
            {signal.severity}
          </Chip>
          <span className="num">{signal.id}</span> · Explainability path
        </span>
      }
      actions={
        <Chip tone={STATUS_TONE[signal.status]} dot size="xs">
          {SIGNAL_STATUS_LABELS[signal.status]}
          {signal.owner ? ` · ${signal.owner}` : ""}
        </Chip>
      }
    >
      <p className="mb-3 text-sm font-medium text-fg">{signal.title}</p>
      <ol className="relative space-y-3 border-l border-border-strong pl-5">
        {signal.explainability.map((step, i) => (
          <li key={step.title} className="relative">
            <span
              aria-hidden
              className="num absolute top-0 -left-[31px] flex size-5 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-[10px] text-muted"
            >
              {i + 1}
            </span>
            <p className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-fg">{step.title}</span>
              <ProvenanceTag value={step.provenance} />
            </p>
            <p className="mt-0.5 text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
      {signal.explainabilityDerived ? (
        <p className="mt-3 text-xs text-subtle">
          This rule ships no authored path; the steps above are assembled from the signal&apos;s detection
          rule and evidence.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Signal actions">
        <Button
          size="sm"
          variant={signal.status === "acknowledged" ? "selected" : "secondary"}
          disabled={closed || pending || signal.status === "acknowledged"}
          onClick={() => void run({ type: "acknowledge" })}
        >
          Acknowledge
        </Button>
        <Button
          size="sm"
          variant="warning"
          aria-pressed={signal.status === "investigate"}
          className={cn(signal.status === "investigate" && "bg-warning/20")}
          disabled={closed || pending || signal.status === "investigate"}
          onClick={() => void run({ type: "investigate" })}
        >
          Investigate
        </Button>
        <Button
          size="sm"
          disabled={closed || pending}
          onClick={() => open("assign")}
          aria-expanded={mode === "assign"}
        >
          Assign to Analyst
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => open("comment")}
          aria-expanded={mode === "comment"}
        >
          Add Commentary
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={closed || pending}
          onClick={() => open("false_positive")}
          aria-expanded={mode === "false_positive"}
        >
          Mark False Positive
        </Button>
        <Button
          size="sm"
          variant="lime"
          disabled={closed || pending}
          onClick={() => open("resolve")}
          aria-expanded={mode === "resolve"}
        >
          Resolve
        </Button>
      </div>

      {mode ? (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-md border border-border bg-surface-2 p-3">
          <p className="text-sm font-semibold text-fg">{FORM_COPY[mode].title}</p>
          {mode === "assign" ? (
            <FilterSelect
              label="Analyst"
              size="sm"
              value={owner}
              options={ANALYSTS.map((a) => ({ value: a, label: a }))}
              onValueChange={setOwner}
            />
          ) : (
            <>
              <label htmlFor={textId} className="sr-only">
                {FORM_COPY[mode].title}
              </label>
              <textarea
                id={textId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder={FORM_COPY[mode].placeholder}
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? errId : undefined}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-info focus:outline-none"
              />
            </>
          )}
          {formError ? (
            <p id={errId} role="alert" className="text-xs text-negative">
              {formError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={pending}>
              {pending ? "Saving…" : FORM_COPY[mode].submit}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-negative/40 bg-negative/8 p-2 text-xs text-negative"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        <p className="label-micro mb-2">Audit trail</p>
        {signal.audit.length ? (
          <ol className="space-y-1.5 text-xs">
            {[...signal.audit].reverse().map((a) => (
              <li key={a.id} className="rounded-md border border-border/70 px-2.5 py-1.5">
                <span className="num text-subtle">
                  {a.at.slice(0, 16).replace("T", " ")} · {a.actor}
                </span>
                <span className="block text-fg">
                  {a.action === "COMMENT"
                    ? `“${a.after ?? ""}”`
                    : a.action === "ASSIGN"
                      ? `Assigned ${a.before ?? "—"} → ${a.after ?? "—"}`
                      : `${a.before ?? "—"} → ${a.after ?? "—"}`}
                </span>
                {a.action !== "COMMENT" ? <span className="block text-muted">{a.reason}</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-subtle">
            No actions yet in this session. Every action is recorded here.
          </p>
        )}
      </div>
    </Panel>
  );
}
