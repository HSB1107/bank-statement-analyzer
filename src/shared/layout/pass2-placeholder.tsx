import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";

export function Pass2Placeholder({
  title,
  description,
  links = [],
}: {
  title: string;
  description?: string;
  links?: readonly { label: string; href: string }[];
}) {
  return (
    <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/70 px-8 py-12 text-center">
      <Construction className="size-8 text-warning" aria-hidden />
      <Chip tone="warning" variant="dashed" mono size="xs">
        Coming in Pass 2
      </Chip>
      <h1 className="text-xl font-semibold text-fg">{title}</h1>
      <p className="text-sm text-muted">
        {description ??
          "This screen is part of the next prototype pass. Pass 1 covers the primary demonstration journey."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map((l) => (
          <Button key={l.href} asChild size="sm">
            <Link href={l.href}>{l.label}</Link>
          </Button>
        ))}
        <Button asChild size="sm" variant="lime">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
