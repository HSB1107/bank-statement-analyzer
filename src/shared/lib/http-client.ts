import { type z } from "zod";
import { apiBaseUrl } from "./data-source";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface HttpClient {
  get<S extends z.ZodType>(
    path: string,
    schema: S,
    query?: Record<string, string | number | undefined>,
  ): Promise<z.infer<S>>;
  post<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>>;
  patch<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>>;
  stream(path: string, init?: { signal?: AbortSignal }): AsyncIterable<string>;
}

function buildUrl(base: string, path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(
    `${base.replace(/\/$/, "")}${path}`,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  return url.toString();
}

/** Fetch wrapper that validates every response with the same Zod schema the mock uses. */
export function createHttpClient(
  base: string = apiBaseUrl(),
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): HttpClient {
  async function request<S extends z.ZodType>(
    method: string,
    path: string,
    schema: S,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ) {
    const res = await fetchImpl(buildUrl(base, path, query), {
      method,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
    });
    if (!res.ok) throw new HttpError(res.status, `${method} ${path} failed with ${res.status}`);
    const json: unknown = await res.json();
    return schema.parse(json);
  }
  return {
    get: (path, schema, query) => request("GET", path, schema, undefined, query),
    post: (path, body, schema) => request("POST", path, schema, body),
    patch: (path, body, schema) => request("PATCH", path, schema, body),
    async *stream(path, init) {
      // Server-Sent Events: yields the `data:` payload of each event.
      const res = await fetchImpl(buildUrl(base, path), {
        headers: { accept: "text/event-stream" },
        signal: init?.signal,
        credentials: "include",
      });
      if (!res.ok || !res.body) throw new HttpError(res.status, `STREAM ${path} failed with ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const data = chunk
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("\n");
          if (data) yield data;
        }
      }
    },
  };
}
