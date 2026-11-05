"use client";

import { ArrowRight, Clock, Eye, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/shared/layout/logo";
import { ThemeToggle } from "@/shared/layout/theme-toggle";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, Skeleton } from "@/shared/ui/states";
import { useShowcase, useSignIn, useTenants } from "../hooks/use-auth";
import { NetworkVisual } from "./network-visual";

const FEATURES = [
  { icon: Lock, label: "MFA enforced by IdP" },
  { icon: ShieldCheck, label: "Regional data residency" },
  { icon: Eye, label: "Session audit logging" },
  { icon: Clock, label: "Idle timeout · 30 min" },
] as const;

export function LoginScreen() {
  const tenants = useTenants();
  const showcase = useShowcase();
  const signIn = useSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const tenant = tenants.data?.find((t) => t.id === tenantId) ?? tenants.data?.[0];
  const next = params.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const stats = showcase.data?.stats;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--lime)_10%,transparent),transparent_55%)] px-6 py-10 sm:px-12 lg:border-r lg:border-b-0">
        <Logo subtitle="BY NUCLEUS SOFTWARE" />
        <div className="max-w-xl">
          <p className="label-micro mb-4 text-lime">◆ Transaction intelligence suite</p>
          <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-fg sm:text-6xl">
            Bank Statement Analyzer
          </h1>
          <p className="mt-5 text-xl text-fg">
            Decode Financial Behaviour. <span className="text-lime">Discover Financial Health.</span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Reads bank statements from any bank, format or currency, then classifies every transaction, finds
            income, obligations and own-account transfers, maps counterparty fund flows and builds an
            explainable financial profile for individuals and businesses — every metric traceable to the
            source row.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats ? (
              [
                [String(stats.pipelineStages), "stage AI pipeline"],
                [String(stats.categories), "transaction categories"],
                [String(stats.confidenceDimensions), "confidence dimensions"],
                [String(stats.regions), `regions · ${stats.currencies} currencies`],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="num text-3xl font-semibold text-info">{v}</dd>
                  <dd className="text-sm text-muted">{l}</dd>
                </div>
              ))
            ) : (
              <Skeleton className="col-span-4 h-12" />
            )}
          </dl>
        </div>
        <div className="hidden sm:block">
          {showcase.data ? <NetworkVisual rows={showcase.data.rows} /> : <Skeleton className="h-[300px]" />}
        </div>
        <p className="label-micro text-[10px]">© 2026 Nucleus Software Exports Ltd · Prototype</p>
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-end gap-3">
          <Chip tone="warning" variant="outline" mono size="xs">
            {tenant?.environment ?? "UAT"}
          </Chip>
          <span className="num text-[11px] tracking-widest text-subtle">{tenant?.dataRegion ?? "—"}</span>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="label-micro">Secure sign-in</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-fg">Welcome back</h2>
          <p className="mt-2 text-muted">Sign in to your Nucleus workspace.</p>

          <p className="label-micro mt-10 mb-2" id="tenant-label">
            Organisation / tenant
          </p>
          {tenants.isError ? (
            <ErrorState error={tenants.error} onRetry={() => void tenants.refetch()} />
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl border border-border-strong bg-surface-2 px-4 py-3"
              aria-labelledby="tenant-label"
            >
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-md bg-info/15 text-xs font-bold text-info"
              >
                {tenant?.initials ?? "··"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{tenant?.name ?? "Loading…"}</p>
                <p className="num text-xs text-subtle">{tenant?.code}</p>
              </div>
              {changing && tenants.data ? (
                <FilterSelect
                  ariaLabel="Choose tenant"
                  value={tenant?.id ?? ""}
                  options={tenants.data.map((t) => ({ value: t.id, label: t.name }))}
                  onValueChange={(v) => {
                    setTenantId(v);
                    setChanging(false);
                  }}
                  size="sm"
                />
              ) : (
                <button
                  type="button"
                  className="text-sm font-medium text-info hover:underline"
                  onClick={() => setChanging(true)}
                >
                  Change
                </button>
              )}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 h-14 w-full text-base font-semibold"
            disabled={!tenant || signIn.isPending}
            onClick={() => {
              if (!tenant) return;
              signIn.mutate(tenant.id, { onSuccess: () => router.push(destination) });
            }}
          >
            {signIn.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            {signIn.isPending ? "Redirecting to Nucleus IdP…" : "Continue with Nucleus SSO"}
            {!signIn.isPending ? <ArrowRight aria-hidden /> : null}
          </Button>
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
          >
            <Loader2 className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            {signIn.isError ? (
              <span className="text-negative">
                {signIn.error instanceof Error ? signIn.error.message : "Sign-in failed"} — try again.
              </span>
            ) : (
              <span>On click: redirects to Nucleus IdP (SAML 2.0 / OIDC) · simulated in prototype</span>
            )}
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-3 border-t border-border pt-6 text-sm text-muted sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="size-4 text-subtle" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-5 text-sm text-subtle">
            <a href="#privacy" className="hover:text-fg">
              Privacy
            </a>
            <a href="#security" className="hover:text-fg">
              Security
            </a>
            <a href="#support" className="hover:text-fg">
              Support
            </a>
            <span className="num ml-auto">v2.4.0</span>
          </div>
        </div>
      </section>
    </div>
  );
}
