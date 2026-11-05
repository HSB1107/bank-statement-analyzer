import { z } from "zod";
import { CaseIdSchema, CustomerIdSchema } from "./ids";
import { CustomerKindSchema } from "./customer";

/** Header strip shared by individual and corporate profiles. */
export const ProfileHeaderSchema = z.object({
  customerId: CustomerIdSchema,
  caseId: CaseIdSchema,
  kind: CustomerKindSchema,
  name: z.string(),
  initials: z.string(),
  reference: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
  coverage: z.object({ covered: z.number().int(), total: z.number().int() }),
  extraction: z.number(),
  classified: z.number(),
  openSignals: z.number().int(),
  savedAt: z.string().nullable(),
});
export type ProfileHeader = z.infer<typeof ProfileHeaderSchema>;

export const SaveProfileResultSchema = z.object({ savedAt: z.string() });
