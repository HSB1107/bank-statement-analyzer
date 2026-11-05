/** HTTP endpoints for the auth port (relative to NEXT_PUBLIC_API_BASE_URL). */
export const AUTH_ENDPOINTS = {
  tenants: "/auth/tenants",
  session: "/auth/session",
  signIn: "/auth/sso/callback",
  signOut: "/auth/logout",
  showcase: "/public/showcase",
} as const;
