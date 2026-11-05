import { z } from "zod";

/** ISO calendar date `YYYY-MM-DD`. All date maths is UTC to stay timezone-independent. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").brand<"IsoDate">();
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const IsoDateTimeSchema = z.iso.datetime().brand<"IsoDateTime">();
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function isoDate(year: number, month1: number, day: number): IsoDate {
  const d = new Date(Date.UTC(year, month1 - 1, day));
  return IsoDateSchema.parse(d.toISOString().slice(0, 10));
}

export function parseIsoDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return IsoDateSchema.parse(d.toISOString().slice(0, 10));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

export function monthKey(value: IsoDate): string {
  return value.slice(0, 7);
}

export function monthIndex(value: IsoDate): number {
  return Number(value.slice(5, 7)) - 1;
}

export function dayOfMonth(value: IsoDate): number {
  return Number(value.slice(8, 10));
}

export function monthShort(month0: number): string {
  return MONTHS[((month0 % 12) + 12) % 12] ?? "";
}

/** `02-Jun` */
export function formatDayMonth(value: IsoDate): string {
  return `${value.slice(8, 10)}-${monthShort(monthIndex(value))}`;
}

/** `05 Nov 2026` */
export function formatLongDate(value: IsoDate): string {
  return `${value.slice(8, 10)} ${monthShort(monthIndex(value))} ${value.slice(0, 4)}`;
}

/** `10-JUN-2026` */
export function formatUpperDate(value: IsoDate): string {
  return `${value.slice(8, 10)}-${monthShort(monthIndex(value)).toUpperCase()}-${value.slice(0, 4)}`;
}

/** Inclusive list of dates. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}
