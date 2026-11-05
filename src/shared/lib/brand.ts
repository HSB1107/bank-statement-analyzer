import { z } from "zod";

/** Branded string ID schema factory: `CaseId`, `CustomerId`, ... are not interchangeable. */
export function brandedId<B extends string>(brand: B, pattern?: RegExp) {
  const base = pattern ? z.string().regex(pattern) : z.string().min(1);
  return base.brand<B>();
}
