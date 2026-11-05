import { z } from "zod";

export const DataSourceSchema = z.enum(["mock", "http"]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/** Reads NEXT_PUBLIC_DATA_SOURCE (inlined at build time). Defaults to mock. */
export function resolveDataSource(raw: string | undefined = process.env.NEXT_PUBLIC_DATA_SOURCE): DataSource {
  const parsed = DataSourceSchema.safeParse(raw ?? "mock");
  return parsed.success ? parsed.data : "mock";
}

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
}
