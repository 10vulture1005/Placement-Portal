import path from "node:path";

/**
 * The repository keeps one .env at the root so Compose, Prisma, and the Python
 * backend all read the same file. These scripts run with the database package as
 * their working directory, so the root file has to be loaded explicitly. Node
 * gives precedence to variables already present in the environment, which is what
 * containers and CI rely on.
 *
 * Call this before constructing PrismaClient, which reads DATABASE_URL eagerly.
 */
export function loadRootEnv() {
  try {
    process.loadEnvFile?.(path.resolve(__dirname, "..", "..", ".env"));
  } catch {
    // No root .env: expected in containers and CI, where values are injected.
  }
}
