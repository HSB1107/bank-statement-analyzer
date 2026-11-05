import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { type ValidationCheck } from "../schemas/cases";

const COUNT_CLS = { ok: "text-positive", warning: "text-warning", error: "text-negative" } as const;

export function ValidationPanel({ checks }: { checks: readonly ValidationCheck[] }) {
  const issues = checks.filter((c) => c.severity === "error").length;
  return (
    <Panel
      title="Document Validation"
      actions={
        issues ? (
          <Chip tone="negative" variant="outline" dot>
            {issues} issues
          </Chip>
        ) : (
          <Chip tone="positive" variant="outline" dot>
            All clear
          </Chip>
        )
      }
    >
      <ul className="divide-y divide-border/70">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
            <span>
              <span className="block text-sm text-fg">{c.label}</span>
              {c.detail ? <span className="block text-[11px] text-subtle">{c.detail}</span> : null}
            </span>
            <span className={`num text-sm font-semibold ${COUNT_CLS[c.severity]}`}>{c.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
