import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the checkout used by frontend/backend contract tests.
 *
 * Local development keeps the two repositories as siblings. CI checks out a
 * pinned backend revision into an in-workspace directory and supplies
 * SMA_ADP_API_DIR so the contract suite cannot accidentally read another
 * checkout (or an untracked working tree).
 */
export function resolveBackendDir(frontendRoot: string): string {
  const configuredDir = process.env.SMA_ADP_API_DIR?.trim();
  if (configuredDir) {
    return path.resolve(configuredDir);
  }

  return path.resolve(frontendRoot, "..", "sma-adp-api");
}

/**
 * Find the frontend repository root from the current working directory.
 * Contract tests are run both from the monorepo root and from an app package.
 */
export function findFrontendRoot(): string {
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "AGENTS.md"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}
