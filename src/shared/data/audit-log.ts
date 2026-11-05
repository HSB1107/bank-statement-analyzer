import { AuditEntrySchema, type AuditEntry } from "./schemas/audit";
import { AuditEntryIdSchema } from "./schemas/ids";
import { IsoDateTimeSchema } from "@/shared/lib/dates";

/**
 * In-memory audit log used by mock adapters. Every mutation appends an entry; original
 * values are preserved in `before`. A real backend would persist these server-side.
 */
export interface AuditLog {
  append(entry: Omit<AuditEntry, "id" | "at">): AuditEntry;
  list(filter?: { entity?: AuditEntry["entity"]; entityId?: string }): AuditEntry[];
}

export function createAuditLog(now: () => Date = () => new Date()): AuditLog {
  const entries: AuditEntry[] = [];
  return {
    append(entry) {
      const full = AuditEntrySchema.parse({
        ...entry,
        id: AuditEntryIdSchema.parse(`AUD-${String(entries.length + 1).padStart(6, "0")}`),
        at: IsoDateTimeSchema.parse(now().toISOString()),
      });
      entries.push(full);
      return full;
    },
    list(filter) {
      return entries.filter(
        (e) =>
          (!filter?.entity || e.entity === filter.entity) &&
          (!filter?.entityId || e.entityId === filter.entityId),
      );
    },
  };
}
