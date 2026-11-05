# Plan — FinnOne Neo BSA, Pass 1 (frontend only)

Source of truth: `docs/FinnOne_Neo_BSA_Pass1_Screens.pdf`, transcribed in `docs/SPEC_NOTES.md`.

1. **Foundation**: Next 16 App Router + TS strict (`noUncheckedIndexedAccess`), Tailwind v4 tokens (dark reference, derived light), next-themes, Inter + JetBrains Mono, shadcn-style primitives in `src/shared/ui`, app shell (sidebar, top bar, ⌘K, footer), formatters (Indian grouping, L/cr, multi-currency, `NotAvailable`), Docker (standalone, non-root) + compose `dev`/`prod`, Vitest, ESLint (boundaries) + Prettier, `npm run check`.
2. **Domain**: Zod schemas in `src/shared/data/schemas` (branded IDs, `Money` in minor units, `Availability<T>`, `Provenance`, six confidence dimensions). Seeded generators (`mulberry32`): Arjun (124 txns), Meridian (9,318 txns), and the portfolio (1,184 customers, 2,947 cases). Pure selectors compute every figure. Invariant tests cover the PDF numbers.
3. **Data layer**: a service port per feature, a `mock` adapter (latency, errors, mutations with audit log, async-iterator pipeline stream) and an `http` stub (endpoint constants and Zod parsing). The composition root in `src/composition` picks adapters via `NEXT_PUBLIC_DATA_SOURCE`. Hooks wrap services with TanStack Query. A contract test suite runs against any adapter.
4. **Auth + Dashboard**: mock SSO and session store (Zustand); dashboard KPIs, pipeline, work queue (TanStack Table), insights, health/segment/liquidity/region/quality panels.
5. **Ingestion + Processing**: file cards (add/remove), coverage grid, validation, account mapping, options form (react-hook-form + Zod); a 21-stage streamed pipeline, live network, trace, exceptions.
6. **Transaction review**: account navigator, filters, virtualised 9,318-row table, classification drawer with audited actions, reconciliation.
7. **Individual profile**: overview / income / liquidity / obligations tabs. Config-driven KPI cards, score dimensions, radar.
8. **Corporate profile**: overview / inflows / liquidity & cash flow / fund flow (interactive graph) tabs.
9. **Risk intelligence + polish**: ranked signals with status mutations, explainability path, timeline, confidence framework; light-theme and a11y pass; docs.

Routes (thin): `/login`, `/dashboard`, `/cases/[caseId]/{ingestion,processing,transactions}`, `/profiles/[customerId]/[tab]` (switches on `kind`), Pass 2 catch-all placeholder.
Commit after each phase. Deviations and data decisions go in `docs/DECISIONS.md`.
