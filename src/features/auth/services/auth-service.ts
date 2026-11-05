import { createServiceToken } from "@/shared/lib/di";
import { type Session, type Showcase, type SignInRequest, type Tenant } from "../schemas/auth";

/** Port: authentication via the Nucleus IdP (SAML 2.0 / OIDC). */
export interface AuthService {
  listTenants(): Promise<Tenant[]>;
  getSession(): Promise<Session | null>;
  signIn(request: SignInRequest): Promise<Session>;
  signOut(): Promise<void>;
  /** Public, pre-auth: sample rows and platform stats for the sign-in page. */
  getShowcase(): Promise<Showcase>;
}

export const AuthServiceToken = createServiceToken<AuthService>("AuthService");
