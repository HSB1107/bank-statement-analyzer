import { type Availability } from "./availability";
import { MINOR_UNIT_EXPONENT, toMajor, type Currency, type Money } from "./money";

export const NOT_AVAILABLE_LABEL = "Not Available";
export const NA_SHORT = "N/A";

const CURRENCY_SYMBOL: Readonly<Record<Currency, string>> = {
  INR: "₹",
  AED: "AED ",
  SAR: "SAR ",
  QAR: "QAR ",
  KWD: "KWD ",
  BHD: "BHD ",
  OMR: "OMR ",
  AUD: "A$",
  NZD: "NZ$",
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOL[currency];
}

const indianFormatters = new Map<number, Intl.NumberFormat>();
function indianFormatter(decimals: number): Intl.NumberFormat {
  let f = indianFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    indianFormatters.set(decimals, f);
  }
  return f;
}

const westernFormatters = new Map<number, Intl.NumberFormat>();
function westernFormatter(decimals: number): Intl.NumberFormat {
  let f = westernFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    westernFormatters.set(decimals, f);
  }
  return f;
}

/** Indian digit grouping: 1,56,800 · 12,20,750 · 9,318. */
export function formatIndianNumber(value: number, decimals = 0): string {
  return indianFormatter(decimals).format(value);
}

/** Western grouping for non-INR currencies: 1,234,567.00 */
export function formatWesternNumber(value: number, decimals = 0): string {
  return westernFormatter(decimals).format(value);
}

/** Generic count formatting (always Indian grouping in this product). */
export function formatCount(value: number): string {
  return formatIndianNumber(value, 0);
}

export type SignStyle = "auto" | "always" | "accounting" | "none";

export type MoneyScale = "full" | "thousand" | "lakh" | "crore" | "auto";

export interface MoneyFormatOptions {
  scale?: MoneyScale;
  decimals?: number;
  sign?: SignStyle;
  /** Omit the currency symbol (for tables already labelled "₹ cr"). */
  symbol?: boolean;
  /** Use the ASCII hyphen-minus instead of the typographic minus. */
  asciiMinus?: boolean;
}

const SCALE_DIVISOR: Readonly<Record<Exclude<MoneyScale, "auto" | "full">, number>> = {
  thousand: 1_000,
  lakh: 1_00_000,
  crore: 1_00_00_000,
};
const SCALE_SUFFIX: Readonly<Record<Exclude<MoneyScale, "auto" | "full">, string>> = {
  thousand: "k",
  lakh: " L",
  crore: " cr",
};

function resolveScale(scale: MoneyScale, majorAbs: number): Exclude<MoneyScale, "auto"> {
  if (scale !== "auto") return scale;
  if (majorAbs >= 1_00_00_000) return "crore";
  if (majorAbs >= 1_00_000) return "lakh";
  return "full";
}

function applySign(
  body: string,
  negative: boolean,
  positive: boolean,
  sign: SignStyle,
  ascii: boolean,
): string {
  const minus = ascii ? "-" : "−";
  switch (sign) {
    case "none":
      return body;
    case "auto":
      return negative ? `${minus}${body}` : body;
    case "always":
      return negative ? `${minus}${body}` : positive ? `+${body}` : body;
    case "accounting":
      return negative ? `(${body})` : body;
  }
}

/**
 * Format Money. INR uses Indian grouping and lakh/crore scales (₹1.38 L, ₹156.40 cr);
 * other currencies use their own symbol and minor-unit precision.
 */
export function formatMoney(m: Money, options: MoneyFormatOptions = {}): string {
  const { scale = "full", sign = "auto", symbol = true, asciiMinus = false } = options;
  const major = toMajor(m);
  const negative = major < 0;
  const positive = major > 0;
  const absMajor = Math.abs(major);
  const sym = symbol ? currencySymbol(m.currency) : "";

  if (m.currency !== "INR") {
    const decimals = options.decimals ?? MINOR_UNIT_EXPONENT[m.currency];
    const resolved = scale === "auto" ? (absMajor >= 1_000_000 ? "million" : "full") : scale;
    const body =
      resolved === "million"
        ? `${sym}${formatWesternNumber(absMajor / 1_000_000, options.decimals ?? 2)} M`
        : `${sym}${formatWesternNumber(absMajor, decimals)}`;
    return applySign(body, negative, positive, sign, asciiMinus);
  }

  const resolved = resolveScale(scale, absMajor);
  let body: string;
  if (resolved === "full") {
    body = `${sym}${formatIndianNumber(absMajor, options.decimals ?? 0)}`;
  } else {
    const decimals = options.decimals ?? (resolved === "crore" ? 2 : resolved === "lakh" ? 2 : 1);
    const scaled = absMajor / SCALE_DIVISOR[resolved];
    body = `${sym}${formatIndianNumber(scaled, decimals)}${SCALE_SUFFIX[resolved]}`;
  }
  return applySign(body, negative, positive, sign, asciiMinus);
}

/** Crore value without symbol/suffix for "₹ cr" tables: 156.40 · (1.25) */
export function formatCroreValue(m: Money, decimals = 2, sign: SignStyle = "accounting"): string {
  const value = toMajor(m) / 1_00_00_000;
  const body = formatIndianNumber(Math.abs(value), decimals);
  return applySign(body, value < 0, value > 0, sign, false);
}

/** Thousand value without symbol for "₹ K" tables: 143 · -8 */
export function formatThousandValue(m: Money, decimals = 0, sign: SignStyle = "auto"): string {
  const value = toMajor(m) / 1_000;
  const body = formatIndianNumber(Math.abs(Number(value.toFixed(decimals))), decimals);
  return applySign(body, value < 0 && Number(value.toFixed(decimals)) !== 0, value > 0, sign, true);
}

/** Percentage from a ratio: 0.154 → "15.4%". */
export function formatPercent(ratio: number, decimals = 1, sign: SignStyle = "auto"): string {
  const pct = ratio * 100;
  const body = `${Math.abs(pct).toFixed(decimals)}%`;
  const rounded = Number(Math.abs(pct).toFixed(decimals));
  return applySign(body, pct < 0 && rounded !== 0, pct > 0 && rounded !== 0, sign, false);
}

/** Percentage-point/ratio difference with sign: "+7.4%" / "−21.8%". */
export function formatDeltaPercent(ratio: number, decimals = 1): string {
  return formatPercent(ratio, decimals, "always");
}

/** Multiple with ×: 0.657 → "0.66×". */
export function formatMultiple(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}×`;
}

/** Confidence 0..1 as "0.84". */
export function formatScore01(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/** Render an Availability<T> with a formatter, falling back to N/A. */
export function formatAvailability<T>(
  a: Availability<T>,
  formatter: (value: T) => string,
  fallback: string = NA_SHORT,
): string {
  return a.status === "available" ? formatter(a.value) : fallback;
}

/** Mask an account number: "XXXX4821". */
export function maskAccount(last4: string, style: "XXXX" | "XX" = "XXXX"): string {
  return `${style}${last4}`;
}

export function formatDurationClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1_000)} KB`;
}
