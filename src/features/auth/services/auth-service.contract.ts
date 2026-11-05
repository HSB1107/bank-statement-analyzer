import { expect, it } from "vitest";
import { type AuthService } from "./auth-service";

/** Contract every AuthService adapter (mock or http) must satisfy. */
export function authServiceContract(make: () => AuthService): void {
  it("lists tenants with codes and data regions", async () => {
    const tenants = await make().listTenants();
    expect(tenants.length).toBeGreaterThan(0);
    expect(tenants[0]?.code).toMatch(/^NUC-/);
  });
  it("signs in to a tenant and returns an MFA session with a 30-minute idle timeout", async () => {
    const svc = make();
    const tenants = await svc.listTenants();
    const session = await svc.signIn({ tenantId: tenants[0]?.id ?? "" });
    expect(session.mfa).toBe(true);
    expect(session.idleTimeoutMinutes).toBe(30);
    expect(session.tenant.id).toBe(tenants[0]?.id);
  });
  it("provides showcase rows and platform stats for the sign-in page", async () => {
    const showcase = await make().getShowcase();
    expect(showcase.rows.length).toBeGreaterThan(3);
    expect(showcase.stats).toEqual({
      pipelineStages: 21,
      categories: 64,
      confidenceDimensions: 6,
      regions: 3,
      currencies: 9,
    });
  });
  it("rejects unknown tenants", async () => {
    await expect(make().signIn({ tenantId: "NOPE" })).rejects.toThrow();
  });
}
