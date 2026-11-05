import { z } from "zod";
import { IsoDateTimeSchema } from "@/shared/lib/dates";
import { RegionSchema } from "@/shared/data/schemas/customer";

export const TenantSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  initials: z.string(),
  environment: z.enum(["UAT", "PROD", "DEV"]),
  dataRegion: z.string(),
  regions: z.array(RegionSchema),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  role: z.string(),
  email: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  user: UserSchema,
  tenant: TenantSchema,
  issuedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  idleTimeoutMinutes: z.number().int().positive(),
  mfa: z.literal(true),
  protocol: z.enum(["SAML 2.0", "OIDC"]),
});
export type Session = z.infer<typeof SessionSchema>;

export const SignInRequestSchema = z.object({ tenantId: z.string().min(1) });
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const TenantListSchema = z.array(TenantSchema);
export const NullableSessionSchema = SessionSchema.nullable();

/** Login-page showcase: real rows from the demo datasets + platform stats. */
export const ShowcaseSchema = z.object({
  rows: z.array(
    z.object({
      label: z.string(),
      amount: z.string(),
      tone: z.enum(["positive", "negative", "transfer", "warning"]),
    }),
  ),
  stats: z.object({
    pipelineStages: z.number().int(),
    categories: z.number().int(),
    confidenceDimensions: z.number().int(),
    regions: z.number().int(),
    currencies: z.number().int(),
  }),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;
