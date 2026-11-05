/**
 * Test helper: a fetch implementation that routes requests to handler functions, so the
 * *http* adapters can run the same contract suite as the mock adapters (JSON round-trip +
 * Zod parsing on the way in).
 */
export type RouteHandler = (ctx: {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}) => Promise<unknown> | unknown;

export interface Route {
  method: "GET" | "POST" | "PATCH";
  /** Path template, e.g. "/cases/:caseId/transactions". */
  path: string;
  handler: RouteHandler;
}

function match(template: string, path: string): Record<string, string> | null {
  const a = template.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const seg = a[i] ?? "";
    const val = b[i] ?? "";
    if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(val);
    else if (seg !== val) return null;
  }
  return params;
}

export function createInMemoryFetch(routes: readonly Route[], base = "http://test/api/v1"): typeof fetch {
  return async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    );
    const path = url.pathname.replace(new URL(base).pathname, "");
    const method = (init?.method ?? "GET").toUpperCase();
    for (const r of routes) {
      if (r.method !== method) continue;
      const params = match(r.path, path);
      if (!params) continue;
      const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      const result = await r.handler({ params, query: url.searchParams, body });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  };
}
