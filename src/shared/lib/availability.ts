import { z } from "zod";

/**
 * A value that may be legitimately unavailable (e.g. April SBI OD balances when the
 * statement is missing). Never coerce NotAvailable to zero.
 */
export const NotAvailableSchema = z.object({
  status: z.literal("not_available"),
  reason: z.string(),
});
export type NotAvailable = z.infer<typeof NotAvailableSchema>;

export function availableSchema<T extends z.ZodType>(value: T) {
  return z.object({ status: z.literal("available"), value });
}

export function availabilitySchema<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("status", [availableSchema(value), NotAvailableSchema]);
}

export type Available<T> = { status: "available"; value: T };
export type Availability<T> = Available<T> | NotAvailable;

export function available<T>(value: T): Available<T> {
  return { status: "available", value };
}

export function notAvailable(reason: string): NotAvailable {
  return { status: "not_available", reason };
}

export function isAvailable<T>(a: Availability<T>): a is Available<T> {
  return a.status === "available";
}

export function mapAvailable<T, U>(a: Availability<T>, fn: (value: T) => U): Availability<U> {
  return a.status === "available" ? available(fn(a.value)) : a;
}

export function availableOr<T>(a: Availability<T>, fallback: T): T {
  return a.status === "available" ? a.value : fallback;
}
