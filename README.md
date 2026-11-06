# FinnOne Neo — Bank Statement Analyzer (Pass 1)

A frontend-only prototype of the 14 Pass 1 screens in `docs/FinnOne_Neo_BSA_Pass1_Screens.pdf` (transcribed in `docs/SPEC_NOTES.md`). Two fictional customers, Arjun Mehta (salaried, 124 transactions) and Meridian Precision Components (SME, 9,318 transactions), are generated once from fixed seeds. **Every figure on every screen is computed from those transactions** by pure selectors, and the PDF's key numbers are pinned by tests. All data is synthetic.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 → sign in with "Continue with Nucleus SSO" (simulated)
npm run check      # typecheck + lint + tests
npm run build && npm start
```

Requires Node ≥ 22. Package manager: **npm** (`package-lock.json` is committed).

### Docker

```bash
docker compose --profile dev up            # hot reload on :3000 (source bind-mounted)
docker compose --profile prod up --build   # standalone production image on :3001 (non-root)
```

The `Dockerfile` is multi-stage: `deps` → `dev` | `build` → `runtime`. The runtime stage contains only the Next.js standalone output and runs as user `nextjs`. Build args `NEXT_PUBLIC_DATA_SOURCE` and `NEXT_PUBLIC_API_BASE_URL` are inlined at build time.

## Screens

| Route                                                                     | Screen                                     |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `/login`                                                                  | SSO login (mock)                           |
| `/dashboard`                                                              | Executive dashboard                        |
| `/cases/BSA-26-04421/ingestion`                                           | Multi-account statement ingestion          |
| `/cases/BSA-26-04421/processing`                                          | AI processing (streamed 21-stage pipeline) |
| `/cases/BSA-26-04421/transactions`                                        | Transaction review & validation            |
| `/profiles/CUST-IN-R-210457/{overview,income,liquidity,obligations,risk}` | Individual profile                         |
| `/profiles/CUST-IN-000318/{overview,inflows,liquidity,fundflow,risk}`     | Corporate profile + AI risk intelligence   |

Pass 2 sidebar items and profile tabs render a "Coming in Pass 2" placeholder.

## Architecture

```
src/
  app/                 thin routes only (parse params, render a feature screen)
  composition/         composition root: container.ts (adapter selection), providers, shell, profile route
  features/<name>/     auth · dashboard · cases · processing · transactions · profile-individual · profile-corporate · risk
    components/ hooks/ schemas/ services/ index.ts   ← index.ts is the only public entry point
  shared/
    data/              Zod domain schemas, seeded generators, selectors, scoring models, signal catalogue
    lib/               Money, Availability, provenance, formatters, PRNG, DI, http client
    ui/ charts/ layout/  presentational primitives and the app shell
```

- **Types come from Zod** (`z.infer`): branded IDs, `Money` in integer minor units, `Availability<T>` for missing data, discriminated unions with exhaustive `switch`.
- **Provenance**: every metric and narrative line is tagged `FACT | DERIVED | AI | INVESTIGATE`. The six confidence dimensions (OCR, extraction, classification, counterparty, completeness, AI interpretation) are kept separate throughout.
- **Feature isolation** is enforced by ESLint. Deep imports (`@/features/x/...`) are banned, `shared/` can't import features, and components can't import adapters directly.
- **Config-driven UI**: KPI cards, score dimensions, radar axes, tabs and table columns are data rendered by shared components.

### Data flow

`component → hook (TanStack Query) → service port → adapter (mock | http) → Zod-validated response`

Mock adapters simulate latency, optional failures, mutations with audit-log entries, and the processing event stream (an async iterator).

## Switching mock → http

```bash
NEXT_PUBLIC_DATA_SOURCE=http NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 npm run dev
```

`src/composition/container.ts` binds every port to its `http-*` adapter. Endpoints and payloads are listed in **`docs/API_CONTRACT.md`**. A backend is compatible when the feature's contract suite passes against it. The suites already run the HTTP adapters against an in-memory server (`src/shared/testing/in-memory-fetch.ts`) and an SSE stream.

## Adding a feature

1. Create `src/features/<name>/{schemas,services,hooks,components}` and an `index.ts`.
2. Define the Zod schemas first, then the port (`<name>-service.ts`) with a `createServiceToken`.
3. Implement `mock-<name>-service.ts` (build from `shared/data` selectors and parse with your schemas) and `http-<name>-service.ts` (endpoint constants in `endpoints.ts`).
4. Write `<name>-service.contract.ts` and a test that runs it against both adapters.
5. Add hooks that call `useService(token)`, then components that use only those hooks.
6. Export the screen, token and adapter factories from `index.ts`, bind them in `src/composition/container.ts`, and add a thin route under `src/app`.

## Tests

`npm test` runs, among others:

- **PDF invariants** (`src/shared/data/*.invariants.test.ts`):
  - Arjun: ₹1,50,392 income, FOIR 15.4%, expense-to-income 93.5%, health score 72, the May EMI return.
  - Meridian: ₹156.40 cr receipts proxy, 73.7% top-3 concentration, +₹3.45 cr net operating, OD 47.7% of ₹12.00 cr, April SBI not available, the K S Trading round trip.
  - Dashboard aggregates.
- **Formatters**: Indian grouping, lakh/crore, multi-currency, N/A.
- **Contract suites** for every service port, run against both the mock and HTTP adapters.

## Docs

- `docs/PLAN.md`: build plan.
- `docs/DECISIONS.md`: choices and places where the screens disagreed.
- `docs/API_CONTRACT.md`: service methods with request/response schemas.
- `docs/SPEC_NOTES.md`: transcription of the PDF.
