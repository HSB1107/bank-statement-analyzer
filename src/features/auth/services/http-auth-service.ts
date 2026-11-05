import { z } from "zod";
import { type HttpClient } from "@/shared/lib/http-client";
import { NullableSessionSchema, SessionSchema, ShowcaseSchema, TenantListSchema } from "../schemas/auth";
import { type AuthService } from "./auth-service";
import { AUTH_ENDPOINTS } from "./endpoints";

/**
 * HTTP adapter. TODO(backend): real SSO is a browser redirect to the IdP; `signIn` here models
 * the callback exchange (POST code/tenant → session). Wire PKCE/state once the IdP is available.
 */
export function createHttpAuthService(http: HttpClient): AuthService {
  return {
    listTenants: () => http.get(AUTH_ENDPOINTS.tenants, TenantListSchema),
    getSession: () => http.get(AUTH_ENDPOINTS.session, NullableSessionSchema),
    signIn: (request) => http.post(AUTH_ENDPOINTS.signIn, request, SessionSchema),
    getShowcase: () => http.get(AUTH_ENDPOINTS.showcase, ShowcaseSchema),
    signOut: async () => {
      await http.post(AUTH_ENDPOINTS.signOut, {}, z.unknown());
    },
  };
}
