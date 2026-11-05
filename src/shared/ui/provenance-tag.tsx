import { type Provenance } from "@/shared/lib/provenance";
import { assertNever } from "@/shared/lib/assert";
import { Chip } from "./chip";
import { type Tone } from "./tone";

const DESCRIPTIONS: Readonly<Record<Provenance, string>> = {
  FACT: "Fact — read directly from a statement row",
  DERIVED: "Derived — calculated from facts",
  AI: "AI — model interpretation; verify before relying on it",
  INVESTIGATE: "Investigate — needs underwriter follow-up",
};

export function provenanceTone(p: Provenance): Tone {
  switch (p) {
    case "FACT":
      return "info";
    case "DERIVED":
      return "lime";
    case "AI":
      return "magenta";
    case "INVESTIGATE":
      return "warning";
    default:
      return assertNever(p, "provenance");
  }
}

export function ProvenanceTag({ value, className }: { value: Provenance; className?: string }) {
  return (
    <Chip
      tone={provenanceTone(value)}
      variant="outline"
      mono
      size="xs"
      className={className}
      title={DESCRIPTIONS[value]}
    >
      {value}
    </Chip>
  );
}
