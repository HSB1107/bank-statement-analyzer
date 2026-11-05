import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { CATEGORY_IDS } from "@/shared/data/schemas/category";
import { RegionSchema } from "@/shared/data/schemas/customer";
import { getArjunDataset } from "@/shared/data/generators/arjun";
import { getMeridianDataset } from "@/shared/data/generators/meridian";
import { PIPELINE_STAGE_DEFS } from "@/shared/data/pipeline";
import { ConfidenceDimensionSchema } from "@/shared/lib/provenance";
import { formatMoney } from "@/shared/lib/format";
import {
  NullableSessionSchema,
  SessionSchema,
  ShowcaseSchema,
  TenantListSchema,
  type Session,
  type Showcase,
  type Tenant,
} from "../schemas/auth";
import { type AuthService } from "./auth-service";

const TENANTS: Tenant[] = [
  {
    id: "NUC-APAC-01",
    code: "NUC-APAC-01",
    name: "Nucleus APAC Lending",
    initials: "NA",
    environment: "UAT",
    dataRegion: "AP-SOUTH-1 · MUMBAI",
    regions: ["IN", "ANZ"],
  },
  {
    id: "NUC-MEA-02",
    code: "NUC-MEA-02",
    name: "Nucleus Middle East Finance",
    initials: "NM",
    environment: "UAT",
    dataRegion: "ME-CENTRAL-1 · UAE",
    regions: ["ME"],
  },
];

const STORAGE_KEY = "finnone-bsa.session";

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}

/** Browser sessionStorage when available (session ends with the tab), else memory. */
export function browserStore(): KeyValueStore {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const s = window.sessionStorage;
      return { get: (k) => s.getItem(k), set: (k, v) => s.setItem(k, v), remove: (k) => s.removeItem(k) };
    }
  } catch {
    /* storage blocked — fall back to memory */
  }
  return memoryStore();
}

/** Regional reporting currencies (IN · ME · ANZ). */
const REPORTING_CURRENCIES = ["INR", "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "AUD", "NZD"] as const;

function buildShowcase(): Showcase {
  const arjun = getArjunDataset().transactions;
  const meridian = getMeridianDataset().transactions;
  const find = <T>(xs: readonly T[], pred: (x: T) => boolean): T | undefined => xs.find(pred);
  const picks = [
    { t: find(arjun, (x) => x.category === "salary" && x.date >= "2026-06-01"), label: "NEFT CR SALARY" },
    {
      t: find(arjun, (x) => x.category === "auto_loan_emi" && x.ledgerEffect.kind === "posted"),
      label: "ACH D AUTO LOAN",
    },
    { t: find(arjun, (x) => x.counterparty.name === "FreshMart"), label: "UPI FRESHMART" },
    {
      t: find(meridian, (x) => x.counterparty.name === "Apex Motors Ltd" && x.date === "2026-06-02"),
      label: "RTGS APEX MOTORS",
    },
    { t: find(meridian, (x) => x.category === "gst" && x.date >= "2026-06-01"), label: "GST CHALLAN" },
    {
      t: find(arjun, (x) => x.category === "own_account_transfer" && x.direction === "debit"),
      label: "IMPS OWN A/C",
    },
  ];
  const rows = picks.flatMap(({ t, label }) => {
    if (!t) return [];
    const transfer = t.category === "own_account_transfer";
    const large = t.amount.amountMinor >= 1_00_00_000_00;
    const lakhs = !large && t.amount.amountMinor >= 10_00_000_00;
    const body = formatMoney(t.amount, {
      scale: large ? "crore" : lakhs ? "lakh" : "full",
      symbol: false,
      decimals: large ? 2 : lakhs ? 1 : 0,
    }).replace(" cr", " Cr");
    const tone = transfer
      ? ("transfer" as const)
      : t.direction === "credit"
        ? ("positive" as const)
        : t.category === "gst"
          ? ("warning" as const)
          : ("negative" as const);
    return [
      { label, amount: transfer ? `⇄ ${body}` : `${t.direction === "credit" ? "+" : "-"}${body}`, tone },
    ];
  });
  return ShowcaseSchema.parse({
    rows,
    stats: {
      pipelineStages: PIPELINE_STAGE_DEFS.length,
      categories: CATEGORY_IDS.length,
      confidenceDimensions: ConfidenceDimensionSchema.options.length,
      regions: RegionSchema.options.length,
      currencies: REPORTING_CURRENCIES.length,
    },
  });
}

export function createMockAuthService(
  runtime: MockRuntime,
  audit: AuditLog,
  store: KeyValueStore = browserStore(),
  now: () => Date = () => new Date(),
): AuthService {
  return {
    async listTenants() {
      await runtime.delay();
      return TenantListSchema.parse(TENANTS);
    },
    async getSession() {
      const raw = store.get(STORAGE_KEY);
      if (!raw) return null;
      const parsed = NullableSessionSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || !parsed.data || new Date(parsed.data.expiresAt) < now()) {
        store.remove(STORAGE_KEY);
        return null;
      }
      return parsed.data;
    },
    async signIn({ tenantId }) {
      await runtime.delay();
      runtime.maybeFail("SSO sign-in");
      const tenant = TENANTS.find((t) => t.id === tenantId);
      if (!tenant) throw new Error(`Unknown tenant ${tenantId}`);
      const issued = now();
      const session: Session = SessionSchema.parse({
        user: {
          id: "u-praman",
          name: "Priya Raman",
          initials: "PR",
          role: "Senior Underwriter · Retail & SME",
          email: "priya.raman@nucleus.example",
        },
        tenant,
        issuedAt: issued.toISOString(),
        expiresAt: new Date(issued.getTime() + 8 * 3600_000).toISOString(),
        idleTimeoutMinutes: 30,
        mfa: true,
        protocol: "OIDC",
      });
      store.set(STORAGE_KEY, JSON.stringify(session));
      audit.append({
        actor: session.user.name,
        entity: "profile",
        entityId: tenant.id,
        action: "SIGN_IN",
        before: null,
        after: "session",
        reason: "SSO (simulated)",
      });
      return session;
    },
    async getShowcase() {
      await runtime.delay();
      return buildShowcase();
    },
    async signOut() {
      const raw = store.get(STORAGE_KEY);
      store.remove(STORAGE_KEY);
      if (raw)
        audit.append({
          actor: "Priya Raman",
          entity: "profile",
          entityId: "session",
          action: "SIGN_OUT",
          before: "session",
          after: null,
          reason: "User signed out",
        });
    },
  };
}
