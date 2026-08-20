import path from "node:path";
import type { NextConfig } from "next";

// The repository keeps one .env at the root so Compose, Prisma, and the Python
// backend all read the same file. Next only looks inside its own directory, so
// load the root file first. Real environment variables already present (as in
// Docker and CI) are not overwritten.
try {
  process.loadEnvFile?.(path.resolve(process.cwd(), "..", ".env"));
} catch {
  // No root .env: expected in containers and CI, where values are injected.
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typedRoutes: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
      ]
    }];
  }
};

export default nextConfig;
