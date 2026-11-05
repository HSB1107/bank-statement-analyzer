import { describe, expect, it } from "vitest";
import { available, notAvailable } from "./availability";
import {
  formatAvailability,
  formatCroreValue,
  formatIndianNumber,
  formatMoney,
  formatMultiple,
  formatPercent,
  formatThousandValue,
} from "./format";
import { fromCrore, fromMajor, money } from "./money";

describe("Indian grouping", () => {
  it.each([
    [156800, "1,56,800"],
    [1220750, "12,20,750"],
    [9318, "9,318"],
    [100, "100"],
    [12345678, "1,23,45,678"],
  ])("%d → %s", (n, expected) => expect(formatIndianNumber(n)).toBe(expected));
});

describe("formatMoney INR", () => {
  it("formats full rupees", () => {
    expect(formatMoney(fromMajor(150392))).toBe("₹1,50,392");
    expect(formatMoney(fromMajor(-4510))).toBe("−₹4,510");
  });
  it("formats lakh and crore scales", () => {
    expect(formatMoney(fromMajor(138000), { scale: "lakh" })).toBe("₹1.38 L");
    expect(formatMoney(fromCrore(156.4), { scale: "crore" })).toBe("₹156.40 cr");
    expect(formatMoney(fromCrore(3.45), { scale: "crore", sign: "always" })).toBe("+₹3.45 cr");
    expect(formatMoney(fromMajor(9100), { scale: "thousand" })).toBe("₹9.1k");
  });
  it("auto-selects scale", () => {
    expect(formatMoney(fromMajor(1220750), { scale: "auto" })).toBe("₹12.21 L");
    expect(formatMoney(fromCrore(12), { scale: "auto" })).toBe("₹12.00 cr");
    expect(formatMoney(fromMajor(4510), { scale: "auto" })).toBe("₹4,510");
  });
  it("uses accounting parentheses for negatives", () => {
    expect(formatCroreValue(fromCrore(-1.25))).toBe("(1.25)");
    expect(formatCroreValue(fromCrore(156.4))).toBe("156.40");
    expect(formatThousandValue(fromMajor(-8340))).toBe("-8");
    expect(formatThousandValue(fromMajor(142500))).toBe("143");
  });
});

describe("formatMoney multi-currency", () => {
  it("keeps native minor-unit precision", () => {
    expect(formatMoney(money(123456, "AED"))).toBe("AED 1,234.56");
    expect(formatMoney(money(1234567, "KWD"))).toBe("KWD 1,234.567");
    expect(formatMoney(fromMajor(780000, "EUR"))).toBe("€780,000.00");
  });
  it("formats millions for large foreign amounts", () => {
    expect(formatMoney(fromMajor(2_500_000, "AUD"), { scale: "auto" })).toBe("A$2.50 M");
  });
});

describe("percent, multiples and availability", () => {
  it("formats ratios", () => {
    expect(formatPercent(0.154)).toBe("15.4%");
    expect(formatPercent(-0.218, 1, "always")).toBe("−21.8%");
    expect(formatPercent(0.074, 1, "always")).toBe("+7.4%");
    expect(formatMultiple(3.45 / 5.25)).toBe("0.66×");
  });
  it("renders NotAvailable instead of zero", () => {
    expect(formatAvailability(notAvailable("SBI April statement missing"), (v: number) => formatPercent(v))).toBe("N/A");
    expect(formatAvailability(available(0.477), (v: number) => formatPercent(v))).toBe("47.7%");
  });
});
