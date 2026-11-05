import { describe } from "vitest";
import { createAuditLog } from "@/shared/data/audit-log";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";
import { createInMemoryFetch } from "@/shared/testing/in-memory-fetch";
import { authServiceContract } from "./auth-service.contract";
import { AUTH_ENDPOINTS } from "./endpoints";
import { createHttpAuthService } from "./http-auth-service";
import { createMockAuthService, memoryStore } from "./mock-auth-service";

const runtime = createMockRuntime({ latencyMs: [0, 0] });
const mock = () => createMockAuthService(runtime, createAuditLog(), memoryStore());

describe("AuthService contract — mock adapter", () => authServiceContract(mock));

describe("AuthService contract — http adapter (in-memory server)", () =>
  authServiceContract(() => {
    const backend = mock();
    const fetchImpl = createInMemoryFetch([
      { method: "GET", path: AUTH_ENDPOINTS.tenants, handler: () => backend.listTenants() },
      { method: "GET", path: AUTH_ENDPOINTS.session, handler: () => backend.getSession() },
      {
        method: "POST",
        path: AUTH_ENDPOINTS.signIn,
        handler: ({ body }) =>
          backend.signIn({
            tenantId: typeof body === "object" && body && "tenantId" in body ? String(body.tenantId) : "",
          }),
      },
      { method: "GET", path: AUTH_ENDPOINTS.showcase, handler: () => backend.getShowcase() },
      { method: "POST", path: AUTH_ENDPOINTS.signOut, handler: () => backend.signOut().then(() => ({})) },
    ]);
    return createHttpAuthService(createHttpClient("http://test/api/v1", fetchImpl));
  }));
