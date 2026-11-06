import type { NextConfig } from "next";

/**
 * Two build targets:
 * - default: `output: "standalone"` for the Docker image (Node server).
 * - GITHUB_PAGES=true: fully static export served from https://<user>.github.io/<repo>/,
 *   so routes are prefixed with the repository base path.
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.PAGES_BASE_PATH ?? "/bank-statement-analyzer";

const nextConfig: NextConfig = {
  ...(pages
    ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } }
    : { output: "standalone" }),
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
