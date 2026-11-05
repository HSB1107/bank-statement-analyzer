import { z } from "zod";
import { IsoDateTimeSchema } from "@/shared/lib/dates";
import { AuditEntryIdSchema } from "./ids";

/** Every mutation produces an audit entry; original values are preserved. */
export const AuditEntrySchema = z.object({
  id: AuditEntryIdSchema,
  at: IsoDateTimeSchema,
  actor: z.string(),
  entity: z.enum(["transaction", "signal", "case", "statement", "profile"]),
  entityId: z.string(),
  action: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  reason: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
