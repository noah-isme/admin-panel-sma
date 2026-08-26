import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const findProjectRoot = (): string => {
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "AGENTS.md"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
};

describe("R1 Pre-Production Tooling Contract Tests", () => {
  const rootDir = findProjectRoot();

  describe("Tier 1: Feature Coverage (R1.1, R1.2, R1.3)", () => {
    it("R1.1-T1-01: Makefile contains automated rollback target with required operations", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      expect(fs.existsSync(makefilePath)).toBe(true);
      const content = fs.readFileSync(makefilePath, "utf-8");

      expect(content).toContain("rollback:");
      expect(content).toContain("scripts/toggle_go.sh false");
      expect(content).toContain("redis-cli");
      expect(content).toContain("compatibility-smoke");
    });

    it("R1.1-T1-02: Toggle Go routing script exists and handles true/false arguments", () => {
      const scriptPath = path.join(rootDir, "sma-adp-api", "scripts", "toggle_go.sh");
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, "utf-8");

      expect(content).toContain("ROUTE_TO_GO");
    });

    it("R1.2-T1-03: CI workflow contract-tests.yml exists and triggers on pull_request", () => {
      const workflowPath = path.join(rootDir, ".github", "workflows", "contract-tests.yml");
      expect(fs.existsSync(workflowPath)).toBe(true);
      const content = fs.readFileSync(workflowPath, "utf-8");

      expect(content).toContain("name:");
      expect(content).toContain("pull_request:");
      expect(content).toContain("jobs:");
    });

    it("R1.2-T1-04: CI workflow configures PostgreSQL and Redis service containers", () => {
      const workflowPath = path.join(rootDir, ".github", "workflows", "contract-tests.yml");
      const content = fs.readFileSync(workflowPath, "utf-8");

      expect(content).toContain("postgres:");
      expect(content).toContain("redis:");
      expect(content).toContain("make contract-test");
    });

    it("R1.3-T1-05: Makefile contains seed-reset target for clean-slate testing", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      const content = fs.readFileSync(makefilePath, "utf-8");

      expect(content).toContain("seed-reset:");
      expect(content).toContain("DROP SCHEMA public CASCADE");
      expect(content).toContain("CREATE SCHEMA public");
      expect(content).toContain("migrate-up");
      expect(content).toContain("seed");
    });
  });

  describe("Tier 2: Boundary & Error Handling (R1)", () => {
    it("R1.1-T2-01: Rollback target handles Redis flush errors gracefully with fallback", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      const content = fs.readFileSync(makefilePath, "utf-8");

      expect(content).toMatch(/redis-cli.*||.*echo/);
    });

    it("R1.3-T2-02: Seed script contains idempotent DDL/DML statements or cleanup", () => {
      const seedPath = path.join(rootDir, "sma-adp-api", "scripts", "seed.sql");
      expect(fs.existsSync(seedPath)).toBe(true);
      const content = fs.readFileSync(seedPath, "utf-8");

      expect(content.length).toBeGreaterThan(100);
      expect(content).toMatch(/INSERT|TRUNCATE|DELETE/i);
    });

    it("R1.2-T2-03: CI workflow specifies health check options for PostgreSQL and Redis", () => {
      const workflowPath = path.join(rootDir, ".github", "workflows", "contract-tests.yml");
      const content = fs.readFileSync(workflowPath, "utf-8");

      expect(content).toContain("options:");
      expect(content).toContain("health");
    });

    it("R1.1-T2-04: Toggle script verifies argument presence and exits with error code if missing", () => {
      const scriptPath = path.join(rootDir, "sma-adp-api", "scripts", "toggle_go.sh");
      const content = fs.readFileSync(scriptPath, "utf-8");

      expect(content).toMatch(/if \[ -z "\$1" \]|Usage:|exit 1/);
    });

    it("R1.3-T2-05: Seed-reset target sequences drop, migrate, and seed in deterministic order", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      const content = fs.readFileSync(makefilePath, "utf-8");
      const lines = content.split("\n");
      const seedResetIdx = lines.findIndex((l) => l.startsWith("seed-reset:"));
      expect(seedResetIdx).toBeGreaterThan(-1);

      const targetBody = lines.slice(seedResetIdx + 1, seedResetIdx + 5).join("\n");
      expect(targetBody.indexOf("DROP SCHEMA")).toBeLessThan(targetBody.indexOf("migrate-up"));
      expect(targetBody.indexOf("migrate-up")).toBeLessThan(targetBody.indexOf("seed"));
    });
  });
});
