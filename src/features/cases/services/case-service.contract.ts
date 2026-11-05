import { expect, it } from "vitest";
import { CaseIdSchema, CustomerIdSchema } from "@/shared/data/schemas/ids";
import { type CaseService } from "./case-service";

const MERIDIAN = CaseIdSchema.parse("BSA-26-04421");

/** Contract every CaseService adapter must satisfy. */
export function caseServiceContract(make: () => CaseService): void {
  it("resolves customer kind for profile routing", async () => {
    const svc = make();
    expect((await svc.getCustomer(CustomerIdSchema.parse("CUST-IN-000318"))).kind).toBe("corporate");
    expect((await svc.getCustomer(CustomerIdSchema.parse("CUST-IN-R-210457"))).kind).toBe("individual");
    expect(await svc.listProfiles()).toHaveLength(2);
  });
  it("returns the case header for the corporate demo case", async () => {
    const c = await make().getCase(MERIDIAN);
    expect(c.accounts).toBe(3);
    expect(c.periodLabel).toBe("Jan – Jun 2026");
  });
  it("derives coverage 17/18 (94.4%) with April SBI missing and two validation issues", async () => {
    const i = await make().getIngestion(MERIDIAN);
    expect(i.files).toHaveLength(9);
    expect([i.coverage.covered, i.coverage.total]).toEqual([17, 18]);
    expect(i.completeness.toFixed(3)).toBe("0.944");
    expect(i.validation.filter((v) => v.severity === "error").map((v) => v.id)).toEqual([
      "duplicates",
      "missing_months",
    ]);
    expect(i.coverageWarning).toMatch(/April|Apr/);
  });
  it("auto-identifies an uploaded April SBI statement and closes the coverage gap", async () => {
    const svc = make();
    const f = await svc.addFile(MERIDIAN, { name: "SBI_OD_0914_Apr26.pdf", sizeBytes: 600_000 });
    expect(f.detected?.last4).toBe("0914");
    expect(f.status.kind).toBe("validated");
    const i = await svc.getIngestion(MERIDIAN);
    expect(i.coverage.covered).toBe(18);
    await svc.removeFile(MERIDIAN, f.id);
    expect((await svc.getIngestion(MERIDIAN)).coverage.covered).toBe(17);
  });
  it("flags unrecognised uploads for manual mapping", async () => {
    const f = await make().addFile(MERIDIAN, { name: "scan_0042.pdf", sizeBytes: 100_000 });
    expect(f.status.kind).toBe("unrecognised");
  });
  it("persists option changes and starts processing", async () => {
    const svc = make();
    const opts = await svc.updateOptions(MERIDIAN, { anomaly: false });
    expect(opts.anomaly).toBe(false);
    const job = await svc.startProcessing(MERIDIAN);
    expect(job.jobId).toMatch(/^JOB-/);
  });
}
