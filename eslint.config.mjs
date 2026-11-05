import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architecture rules:
 * - Features may only be imported through their public `index.ts` (`@/features/<name>`).
 *   Deep imports (`@/features/<name>/...`) are forbidden everywhere; inside a feature use relative paths.
 * - `src/shared` must not depend on features or the composition root.
 * - Components never import mock adapters directly; only the composition root wires adapters.
 */
const featureDeepImport = {
  group: ["@/features/*/*", "@/features/*/**"],
  message: "Import features only via their public index: '@/features/<name>'.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-restricted-imports": ["error", { patterns: [featureDeepImport] }],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features", "@/features/**"], message: "shared/ must not depend on features." },
            { group: ["@/composition", "@/composition/**"], message: "shared/ must not depend on the composition root." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/components/**", "src/features/**/hooks/**", "src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            featureDeepImport,
            { group: ["**/services/mock-*", "**/services/http-*"], message: "Use hooks → service ports; adapters are wired in src/composition." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
