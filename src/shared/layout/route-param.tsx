import { type z } from "zod";
import { Pass2Placeholder } from "./pass2-placeholder";

/** Parses a route param with a branded schema; unknown ids show the Pass 2 placeholder. */
export function withParsedParam<S extends z.ZodType>(
  schema: S,
  value: string,
  render: (v: z.infer<S>) => React.ReactNode,
  what: string,
) {
  const parsed = schema.safeParse(decodeURIComponent(value));
  if (!parsed.success)
    return (
      <Pass2Placeholder title={`${what} not found`} description={`“${value}” is not a valid identifier.`} />
    );
  return render(parsed.data);
}
