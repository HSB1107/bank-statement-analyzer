/** Exhaustiveness guard for discriminated unions / enums in `switch`. */
export function assertNever(value: never, context = "value"): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`);
}

/** Narrowing helper for array lookups under `noUncheckedIndexedAccess`. */
export function expectDefined<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}
