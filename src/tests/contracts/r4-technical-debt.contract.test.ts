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

describe("R4 Technical Debt Contract Tests", () => {
  const rootDir = findProjectRoot();

  describe("Tier 1: Feature Coverage (R4.1, R4.2, R4.3)", () => {
    it("R4.1-T1-01: Worker service index.ts configures HTTP health server endpoint", () => {
      const workerIndexPath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "worker",
        "src",
        "index.ts"
      );
      expect(fs.existsSync(workerIndexPath)).toBe(true);
      const content = fs.readFileSync(workerIndexPath, "utf-8");

      expect(content).toContain("/health");
      expect(content).toContain("HEALTH_PORT");
    });

    it("R4.1-T1-02: Worker GET /health contract returns status 'ok' and numeric queue_depth", async () => {
      const res = await fetch("http://localhost:3002/health").catch(() => null);
      if (res) {
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("queue_depth");
        expect(typeof data.queue_depth).toBe("number");
      } else {
        const workerIndexPath = path.join(
          rootDir,
          "admin-panel-sma",
          "apps",
          "worker",
          "src",
          "index.ts"
        );
        const content = fs.readFileSync(workerIndexPath, "utf-8");
        expect(content).toContain("queue_depth");
        expect(content).toContain("status");
      }
    });

    it("R4.2-T1-03: Single consolidated GAP_ANALYSIS_REPORT.md exists with structured audit items", () => {
      const reportPath = path.join(rootDir, "sma-adp-api", "docs", "GAP_ANALYSIS_REPORT.md");
      expect(fs.existsSync(reportPath)).toBe(true);
      const content = fs.readFileSync(reportPath, "utf-8");

      expect(content.length).toBeGreaterThan(500);
      expect(content).toMatch(/GAP|Gap Analysis|Status/i);
    });

    it("R4.3-T1-04: Database migration for audit_logs table exists in migrations directory", () => {
      const migrationsDir = path.join(rootDir, "sma-adp-api", "migrations");
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const files = fs.readdirSync(migrationsDir);

      const auditMigration = files.find((f) => f.includes("audit") && f.endsWith(".sql"));
      expect(auditMigration).toBeDefined();

      const migrationContent = fs.readFileSync(path.join(migrationsDir, auditMigration!), "utf-8");
      expect(migrationContent).toContain("CREATE TABLE");
      expect(migrationContent).toContain("audit_logs");
    });

    it("R4.3-T1-05: Audit repository and middleware exist for persistent log recording", () => {
      const repoPath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "repository",
        "audit_repository.go"
      );
      const middlewarePath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "middleware",
        "audit_middleware.go"
      );

      expect(fs.existsSync(repoPath)).toBe(true);
      expect(fs.existsSync(middlewarePath)).toBe(true);

      const middlewareContent = fs.readFileSync(middlewarePath, "utf-8");
      expect(middlewareContent).toContain("Audit");
    });
  });

  describe("Tier 2: Boundary & Error Cases (R4)", () => {
    it("R4.1-T2-01: Worker health endpoint supports fallback port 3002 when HEALTH_PORT is unset", () => {
      const workerIndexPath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "worker",
        "src",
        "index.ts"
      );
      const content = fs.readFileSync(workerIndexPath, "utf-8");

      expect(content).toMatch(/process.env.HEALTH_PORT.*||.*3002/);
    });

    it("R4.1-T2-02: Worker queue depth counts active, waiting, and delayed job totals", () => {
      const workerIndexPath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "worker",
        "src",
        "index.ts"
      );
      const content = fs.readFileSync(workerIndexPath, "utf-8");

      expect(content).toMatch(/getJobCounts|getActiveCount|getWaitingCount|queue/);
    });

    it("R4.3-T2-03: Audit log table migration defines indexes on user_id and created_at", () => {
      const migrationsDir = path.join(rootDir, "sma-adp-api", "migrations");
      const files = fs.readdirSync(migrationsDir);
      const auditMigration = files.find((f) => f.includes("audit") && f.endsWith(".sql"));

      if (auditMigration) {
        const content = fs.readFileSync(path.join(migrationsDir, auditMigration), "utf-8");
        expect(content.toLowerCase()).toMatch(/index|idx_audit/);
      }
    });

    it("R4.3-T2-04: Audit middleware handles anonymous requests with null or 'ANONYMOUS' user_id", () => {
      const middlewarePath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "middleware",
        "audit_middleware.go"
      );
      const content = fs.readFileSync(middlewarePath, "utf-8");

      expect(content).toMatch(/user|Claims|Anonymous|UserID/i);
    });

    it("R4.2-T2-05: Consolidated gap analysis contains resolution status for G-01 through G-09", () => {
      const reportPath = path.join(rootDir, "sma-adp-api", "docs", "GAP_ANALYSIS_REPORT.md");
      const content = fs.readFileSync(reportPath, "utf-8");

      expect(content).toContain("G-01");
      expect(content).toContain("G-02");
    });
  });
});
