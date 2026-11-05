import { formatLongDate } from "@/shared/lib/dates";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { meridianAnalytics } from "@/shared/data/demo-profiles";
import { getMeridianDataset } from "@/shared/data/generators/meridian";
import { type CustomerId } from "@/shared/data/schemas/ids";
import { ProfileHeaderSchema } from "@/shared/data/schemas/profile";
import { meridianSignals } from "@/shared/data/signals";
import { type CorporateProfileService } from "./corporate-service";
import { corporateLiquidityVm, fundFlowVm } from "./corporate-vm-liquidity";
import { corporateOverviewVm, inflowsVm } from "./corporate-vm-overview";

function assertDemo(customerId: CustomerId): void {
  if (customerId !== getMeridianDataset().customer.id)
    throw new Error(`Corporate profile ${customerId} is coming in Pass 2 (Pass 1 demo: Meridian Precision).`);
}

export function createMockCorporateService(runtime: MockRuntime, audit: AuditLog): CorporateProfileService {
  let savedAt: string | null = null;
  const run = async <T>(id: CustomerId, build: () => T): Promise<T> => {
    await runtime.delay();
    runtime.maybeFail("corporate profile");
    assertDemo(id);
    return build();
  };
  return {
    getHeader: (id) =>
      run(id, () => {
        const ds = getMeridianDataset();
        const { metrics } = meridianAnalytics();
        const c = ds.customer;
        return ProfileHeaderSchema.parse({
          customerId: c.id,
          caseId: c.caseId,
          kind: c.kind,
          name: c.name,
          initials: c.initials,
          reference: `${c.id} · ${c.segmentLabel} · ${c.sector} · ${c.caseId}`,
          facts: [
            { label: "Period", value: c.period.label.replace("–", "-") },
            { label: "Accounts", value: String(ds.accounts.length) },
            { label: "Transactions", value: ds.transactions.length.toLocaleString("en-IN") },
            { label: "Banks", value: ds.accounts.map((a) => a.bank).join(" · ") },
            { label: "Currency", value: `${c.reportingCurrency} · ₹ cr` },
            { label: "Analysed", value: formatLongDate(c.analysedOn) },
          ],
          coverage: { covered: metrics.coverage.covered, total: metrics.coverage.total },
          extraction: metrics.quality.extractionConfidence,
          classified: metrics.quality.classificationConfidence,
          openSignals: meridianSignals().filter((s) => s.status !== "false_positive").length,
          savedAt,
        });
      }),
    getOverview: (id) => run(id, corporateOverviewVm),
    getInflows: (id) => run(id, inflowsVm),
    getLiquidity: (id) => run(id, corporateLiquidityVm),
    getFundFlow: (id) => run(id, fundFlowVm),
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
