import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const workspaceRoot = fs.existsSync(path.join(process.cwd(), "vercel.json"))
  ? process.cwd()
  : path.join(process.cwd(), "admin-panel-sma");

const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf8"));

describe("Vercel combined frontend deployment contract", () => {
  const configPath = path.join(workspaceRoot, "vercel.json");
  const config = readJson(configPath);
  const buildScriptPath = path.join(workspaceRoot, "scripts/vercel-build.sh");
  const buildScript = fs.readFileSync(buildScriptPath, "utf8");
  const rewrites = config.rewrites as Array<Record<string, string>>;

  it("uses the root combined deployment with immutable dependency installation", () => {
    expect(config.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(config.buildCommand).toBe("pnpm build:vercel");
    expect(config.outputDirectory).toBe("deploy");
    expect(buildScript).toContain("pnpm --filter @apps/shared build");
    expect(buildScript).toContain("pnpm --filter @apps/landing build");
    expect(buildScript).toContain("pnpm --filter @apps/admin build");
    expect(buildScript).toContain(
      "cp apps/admin/dist/mockServiceWorker.js deploy/mockServiceWorker.js"
    );
  });

  it("publishes admin and landing SPA deep links without an admin-only config", () => {
    expect(rewrites).toEqual(
      expect.arrayContaining([
        { source: "/admin", destination: "/admin/index.html" },
        { source: "/admin/(.*)", destination: "/admin/index.html" },
      ])
    );
    expect(rewrites).toContainEqual({
      source: "/((?!admin(?:/|$)).*)",
      destination: "/index.html",
    });
    expect(fs.existsSync(path.join(workspaceRoot, "apps/admin/vercel.json"))).toBe(false);
  });

  it("pins Vercel's Node.js major version and documents environment isolation", () => {
    const packageJson = readJson(path.join(workspaceRoot, "package.json"));
    const deploymentDoc = fs.readFileSync(
      path.join(workspaceRoot, "docs/VERCEL_DEPLOYMENT.md"),
      "utf8"
    );

    expect(packageJson.engines?.node).toBe("20.x");
    expect(deploymentDoc).toMatch(/Root Directory\s+\|\s+`\.`/);
    expect(deploymentDoc).toContain("`pnpm install --frozen-lockfile`");
    expect(deploymentDoc).toMatch(
      /\|\s*`VITE_API_URL`\s*\|\s*`https:\/\/api\.example\.sch\.id\/api\/v1`\s*\|\s*`\/api`\s*\|/
    );
    expect(deploymentDoc).toContain("`/admin/login`");
    expect(deploymentDoc).toContain("`/admin/students`");
  });
});
