import { z } from "zod";

/**
 * Currencies supported by the analyser. The nine regional reporting currencies
 * (INR · AED SAR QAR KWD BHD OMR · AUD NZD) plus common settlement currencies.
 */
export const CurrencySchema = z.enum([
  "INR",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "AUD",
  "NZD",
  "EUR",
  "USD",
  "GBP",
]);
export type Currency = z.infer<typeof CurrencySchema>;

/** ISO 4217 minor-unit exponent. KWD/BHD/OMR have three decimals. */
export const MINOR_UNIT_EXPONENT: Readonly<Record<Currency, number>> = {
  INR: 2,
  AED: 2,
  SAR: 2,
  QAR: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  AUD: 2,
  NZD: 2,
  EUR: 2,
  USD: 2,
  GBP: 2,
};

export const MinorUnitsSchema = z
  .number()
  .int()
  .refine(Number.isSafeInteger, "Amount exceeds safe integer range")
  .brand<"MinorUnits">();
export type MinorUnits = z.infer<typeof MinorUnitsSchema>;

/** Money is always integer minor units + currency. Never a float of major units. */
export const MoneySchema = z.object({
  amountMinor: MinorUnitsSchema,
  currency: CurrencySchema,
});
export type Money = z.infer<typeof MoneySchema>;

function minor(value: number): MinorUnits {
  return MinorUnitsSchema.parse(value);
}

export function money(amountMinor: number, currency: Currency = "INR"): Money {
  return { amountMinor: minor(Math.round(amountMinor)), currency };
}

/** Build from major units (e.g. rupees). Rounds half away from zero to the minor unit. */
export function fromMajor(major: number, currency: Currency = "INR"): Money {
  const factor = 10 ** MINOR_UNIT_EXPONENT[currency];
  const scaled = Math.sign(major) * Math.round(Math.abs(major) * factor);
  return money(scaled, currency);
}

/** ₹ crore → Money (1 cr = 1,00,00,000 rupees). */
export function fromCrore(crore: number): Money {
  return money(Math.round(crore * 1e9), "INR");
}

export function fromLakh(lakh: number): Money {
  return money(Math.round(lakh * 1e7), "INR");
}

export function toMajor(m: Money): number {
  return m.amountMinor / 10 ** MINOR_UNIT_EXPONENT[m.currency];
}

export function zero(currency: Currency = "INR"): Money {
  return money(0, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}. Convert before combining.`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function negate(a: Money): Money {
  return money(-a.amountMinor, a.currency);
}

export function abs(a: Money): Money {
  return money(Math.abs(a.amountMinor), a.currency);
}

export function sum(items: readonly Money[], currency: Currency = "INR"): Money {
  return items.reduce<Money>((acc, m) => add(acc, m), zero(currency));
}

export function sumMinor(values: readonly number[], currency: Currency = "INR"): Money {
  return money(
    values.reduce((a, b) => a + b, 0),
    currency,
  );
}

/** Ratio a / b as a plain number (same currency). Returns null when b is zero. */
export function ratio(a: Money, b: Money): number | null {
  assertSameCurrency(a, b);
  return b.amountMinor === 0 ? null : a.amountMinor / b.amountMinor;
}

export function scale(a: Money, factor: number): Money {
  return money(Math.round(a.amountMinor * factor), a.currency);
}

export function isNegative(a: Money): boolean {
  return a.amountMinor < 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amountMinor - b.amountMinor;
}

/** FX conversion with an explicit rate (target per 1 unit of source). Rate is recorded by the caller. */
export function convert(a: Money, target: Currency, rate: number): Money {
  const majorTarget = toMajor(a) * rate;
  return fromMajor(majorTarget, target);
}
