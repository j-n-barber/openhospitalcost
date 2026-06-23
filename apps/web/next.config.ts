import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin the workspace root to this app — stray lockfiles (repo root, home dir)
// otherwise confuse Next's root inference.
const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root },
  // Site retired: serve the static case-study explainer at the root, masking the
  // URL (stays "/"). `beforeFiles` overrides the app-router homepage and falls
  // through to apps/web/public/explainer.html. No Vercel root-directory change needed.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/explainer.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
