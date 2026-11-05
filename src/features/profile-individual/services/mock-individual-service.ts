import { formatLongDate } from "@/shared/lib/dates";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { arjunAnalytics } from "@/shared/data/demo-profiles";
import { getArjunDataset } from "@/shared/data/generators/arjun";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { ProfileHeaderSchema } from "@/shared/data/schemas/profile";
import { arjunOpenSignals, incomeVm, liquidityVm, obligationsVm, overviewVm } from "./individual-view-models";
import { type IndividualProfileService } from "./individual-service";

function assertDemo(customerId: CustomerId): void {
  if (customerId !== getArjunDataset().customer.id)
    throw new Error(`Individual profile ${customerId} is coming in Pass 2 (Pass 1 demo: Arjun Mehta).`);
}

export function createMockIndividualService(runtime: MockRuntime, audit: AuditLog): IndividualProfileService {
  let savedAt: string | null = null;
  const run = async <T>(customerId: CustomerId, build: () => T): Promise<T> => {
    await runtime.delay();
    runtime.maybeFail("profile");
    assertDemo(customerId);
    return build();
  };
  return {
    getHeader: (id) =>
      run(id, () => {
        const ds = getArjunDataset();
        const { metrics } = arjunAnalytics();
        const c = ds.customer;
        return ProfileHeaderSchema.parse({
          customerId: c.id,
          caseId: c.caseId,
          kind: c.kind,
          name: c.name,
          initials: c.initials,
          reference: `${c.id} · ${c.segmentLabel} · ${c.caseId}`,
          facts: [
            { label: "Period", value: c.period.label.replace("–", "-") },
            { label: "Accounts", value: String(ds.accounts.length) },
            { label: "Transactions", value: String(ds.transactions.length) },
            { label: "Banks", value: ds.accounts.map((a) => a.bank).join(" · ") },
            { label: "Currency", value: c.reportingCurrency },
            { label: "Analysed", value: formatLongDate(c.analysedOn) },
          ],
          coverage: { covered: ds.accounts.length * 6, total: ds.accounts.length * 6 },
          extraction: metrics.quality.extractionConfidence,
          classified: metrics.quality.classifiedShare,
          openSignals: arjunOpenSignals(),
          savedAt,
        });
      }),
    getOverview: (id) => run(id, overviewVm),
    getIncome: (id) => run(id, incomeVm),
    getLiquidity: (id) => run(id, liquidityVm),
    getObligations: (id) => run(id, obligationsVm),
    async saveFinal(id) {
      await runtime.delay();
      assertDemo(id);
      savedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      audit.append({
        actor: "Priya Raman",
        entity: "profile",
        entityId: id,
        action: "SAVE_FINAL_PROFILE",
        before: null,
        after: savedAt,
        reason: "Underwriter saved final profile",
      });
      return { savedAt };
    },
  };
}
