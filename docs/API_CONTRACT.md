# API contract

Each feature defines a **service port** (TypeScript interface) in `src/features/<feature>/services/*-service.ts`. Two adapters implement it:

- `mock-*` builds responses from the seeded datasets via pure selectors.
- `http-*` calls the endpoints below.

Both validate responses with the **same Zod schemas** (`src/features/<feature>/schemas`), so a backend must return payloads that parse under them. Every adapter must pass the feature's contract suite (`*-service.contract.ts`). The HTTP adapter is already exercised against an in-memory server in `*-service.test.ts`.

Conventions:

- All paths are relative to `NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`).
- **Money** is `{ amountMinor: integer, currency: ISO-4217 }`: integer minor units, never floats. KWD, BHD and OMR use 3 decimals.
- **Availability** is `{ status: "available", value } | { status: "not_available", reason }`. Missing data (e.g. April SBI) is never sent as `0`.
- **IDs** are branded strings validated by pattern: `CaseId` `BSA-26-04421`, `CustomerId` `CUST-IN-000318`, `SignalId` `RS-C-04`.
- **Provenance** on narrative lines: `FACT | DERIVED | AI | INVESTIGATE`.
- **Mutations** return the updated resource, and the server writes an audit entry (`actor, action, before, after, reason`). Originals are never overwritten.

## auth — `AuthService`

| Method                 | HTTP                      | Request               | Response schema         |
| ---------------------- | ------------------------- | --------------------- | ----------------------- |
| `listTenants()`        | `GET /auth/tenants`       | —                     | `TenantListSchema`      |
| `getSession()`         | `GET /auth/session`       | —                     | `NullableSessionSchema` |
| `signIn({ tenantId })` | `POST /auth/sso/callback` | `SignInRequestSchema` | `SessionSchema`         |
| `signOut()`            | `POST /auth/logout`       | `{}`                  | —                       |
| `getShowcase()`        | `GET /public/showcase`    | —                     | `ShowcaseSchema`        |

TODO(backend): real SSO is a browser redirect to the Nucleus IdP (SAML 2.0 / OIDC). `signIn` models the callback exchange.

## dashboard — `DashboardService`

| Method                 | HTTP                                                        | Request                  | Response schema           |
| ---------------------- | ----------------------------------------------------------- | ------------------------ | ------------------------- |
| `getOverview(filters)` | `GET /dashboard/overview?periodDays&segment&region&analyst` | `DashboardFiltersSchema` | `DashboardOverviewSchema` |
| `getLiquidity(query)`  | `GET /dashboard/liquidity?group&currency`                   | `LiquidityQuerySchema`   | `LiquiditySnapshotSchema` |
| `getWorkQueue(query)`  | `POST /dashboard/work-queue`                                | `WorkQueueQuerySchema`   | `WorkQueuePageSchema`     |

## cases — `CaseService`

| Method                                    | HTTP                                 | Request                        | Response schema                                             |
| ----------------------------------------- | ------------------------------------ | ------------------------------ | ----------------------------------------------------------- |
| `getCase(caseId)`                         | `GET /cases/:caseId`                 | —                              | `CaseDetailSchema`                                          |
| `getCustomer(customerId)`                 | `GET /customers/:customerId`         | —                              | `CustomerSummarySchema` (its `kind` selects the profile UI) |
| `listProfiles()`                          | `GET /customers/profiles`            | —                              | `CustomerListSchema`                                        |
| `getIngestion(caseId)`                    | `GET /cases/:caseId/ingestion`       | —                              | `IngestionSchema`                                           |
| `addFile(caseId, file)`                   | `POST /cases/:caseId/files`          | `AddFileRequestSchema`         | `StatementFileSchema`                                       |
| `removeFile(caseId, fileId)`              | `POST /cases/:caseId/files/remove`   | `{ fileId }`                   | —                                                           |
| `updateContext(caseId, ctx)`              | `PATCH /cases/:caseId/context`       | `CustomerContextSchema`        | `CustomerContextSchema`                                     |
| `setAccountRole(caseId, accountId, role)` | `PATCH /cases/:caseId/accounts/role` | `{ accountId, role }`          | —                                                           |
| `updateOptions(caseId, patch)`            | `PATCH /cases/:caseId/options`       | `ProcessingOptionsPatchSchema` | `ProcessingOptionsSchema`                                   |
| `validate(caseId)`                        | `POST /cases/:caseId/validate`       | `{}`                           | `ValidationCheckSchema[]`                                   |
| `startProcessing(caseId)`                 | `POST /cases/:caseId/processing`     | `{}`                           | `StartProcessingResultSchema`                               |

TODO(backend): uploads will be multipart / presigned URLs. The prototype sends file metadata only.

## processing — `ProcessingService`

| Method            | HTTP                                         | Request | Response                                  |
| ----------------- | -------------------------------------------- | ------- | ----------------------------------------- |
| `getPlan(caseId)` | `GET /cases/:caseId/processing/plan`         | —       | `ProcessingPlanSchema`                    |
| `stream(caseId)`  | `GET /cases/:caseId/processing/events` (SSE) | —       | `ProcessingEventSchema` per `data:` frame |

Events are `{ type: "stage", index, status, progress, elapsedSec } | { type: "trace", tag, text } | { type: "done", elapsedSec }`. The mock yields the same events from an async iterator.

## transactions — `TransactionService`

| Method                         | HTTP                                           | Request                                                          | Response schema       |
| ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------- | --------------------- |
| `getSummary(caseId)`           | `GET /cases/:caseId/transactions/summary`      | —                                                                | `ReviewSummarySchema` |
| `list(caseId, filter)`         | `POST /cases/:caseId/transactions/search`      | `TxnFilterSchema`                                                | `TxnPageSchema`       |
| `getDetail(caseId, id)`        | `GET /cases/:caseId/transactions/:id`          | —                                                                | `TxnDetailSchema`     |
| `applyAction(caseId, id, req)` | `POST /cases/:caseId/transactions/:id/actions` | `TxnActionRequestSchema` (`{ action, reason }`, reason required) | `TxnDetailSchema`     |
| `acceptAllAbove(caseId, t)`    | `POST /cases/:caseId/transactions/accept-all`  | `{ threshold }`                                                  | `BulkResultSchema`    |
| `approve(caseId)`              | `POST /cases/:caseId/transactions/approve`     | `{}`                                                             | `BulkResultSchema`    |

Actions: `accept | change_category{category} | internal_transfer | mark_recurring | comment{text} | toggle_non_operating | flag`. TODO(backend): cursor paging for `list` (the table is virtualised and accepts any page size).

## profile-individual — `IndividualProfileService` (`/profiles/individual/:customerId/…`)

| Method           | HTTP                | Response schema             |
| ---------------- | ------------------- | --------------------------- |
| `getHeader`      | `GET …/header`      | `ProfileHeaderSchema`       |
| `getOverview`    | `GET …/overview`    | `IndividualOverviewSchema`  |
| `getIncome`      | `GET …/income`      | `IncomeAnalysisSchema`      |
| `getLiquidity`   | `GET …/liquidity`   | `LiquidityAnalysisSchema`   |
| `getObligations` | `GET …/obligations` | `ObligationsAnalysisSchema` |
| `saveFinal`      | `POST …/final`      | `SaveProfileResultSchema`   |

## profile-corporate — `CorporateProfileService` (`/profiles/corporate/:customerId/…`)

| Method         | HTTP              | Response schema            |
| -------------- | ----------------- | -------------------------- |
| `getHeader`    | `GET …/header`    | `ProfileHeaderSchema`      |
| `getOverview`  | `GET …/overview`  | `CorporateOverviewSchema`  |
| `getInflows`   | `GET …/inflows`   | `InflowAnalysisSchema`     |
| `getLiquidity` | `GET …/liquidity` | `CorporateLiquiditySchema` |
| `getFundFlow`  | `GET …/fund-flow` | `FundFlowSchema`           |
| `saveFinal`    | `POST …/final`    | `SaveProfileResultSchema`  |

## risk — `RiskService`

| Method                                  | HTTP                                                 | Request              | Response schema       |
| --------------------------------------- | ---------------------------------------------------- | -------------------- | --------------------- |
| `getWorkspace(caseId)`                  | `GET /cases/:caseId/risk`                            | —                    | `RiskWorkspaceSchema` |
| `applyAction(caseId, signalId, action)` | `POST /cases/:caseId/risk/signals/:signalId/actions` | `SignalActionSchema` | `SignalViewSchema`    |

Actions: `acknowledge | investigate | assign{owner} | comment{text} | false_positive{reason} | resolve{reason}`. Signals are indicators for review. None of them approves or declines credit.
