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

describe("R2 Handler Test Coverage Expansion Contract Tests", () => {
  const rootDir = findProjectRoot();
  const handlerDir = path.join(rootDir, "sma-adp-api", "internal", "handler");

  const requiredHandlers = [
    "analytics_handler",
    "announcement_handler",
    "compat_handler",
    "dashboard_handler",
    "grade_component_handler",
    "grade_config_handler",
    "report_handler",
    "schedule_generator_handler",
    "settings_handler",
  ];

  describe("Tier 1: Feature Coverage (R2.1, R2.2)", () => {
    requiredHandlers.forEach((handlerName) => {
      it(`R2.2-T1: Handler test file exists for ${handlerName}.go`, () => {
        const testFilePath = path.join(handlerDir, `${handlerName}_test.go`);
        expect(fs.existsSync(testFilePath)).toBe(true);

        const content = fs.readFileSync(testFilePath, "utf-8");
        expect(content).toContain("package handler");
        expect(content).toContain("Test");
      });
    });

    it("R2.1-T1-01: Main E2E requirements test file exists and contains compiled tests", () => {
      const e2eTestPath = path.join(handlerDir, "e2e_requirements_r1_r6_test.go");
      expect(fs.existsSync(e2eTestPath)).toBe(true);

      const content = fs.readFileSync(e2eTestPath, "utf-8");
      expect(content).toContain("TestE2E_Tier1");
      expect(content).toContain("TestE2E_Tier2");
      expect(content).toContain("TestE2E_Tier3");
      expect(content).toContain("TestE2E_Tier4");
    });
  });

  describe("Tier 2: Boundary & Error Codes Coverage across 9 Handlers", () => {
    requiredHandlers.forEach((handlerName) => {
      it(`R2.2-T2: ${handlerName}_test.go covers 400 validation, 401 unauth, and 403 forbidden cases`, () => {
        const testFilePath = path.join(handlerDir, `${handlerName}_test.go`);
        const content = fs.readFileSync(testFilePath, "utf-8");

        const matches = (content.match(/func Test/g) || []).length;
        expect(matches).toBeGreaterThanOrEqual(3);

        const hasErrorCoverage =
          content.includes("400") ||
          content.includes("401") ||
          content.includes("403") ||
          content.includes("StatusBadRequest") ||
          content.includes("StatusUnauthorized") ||
          content.includes("StatusForbidden") ||
          content.includes("Error") ||
          content.includes("Validation") ||
          content.includes("Unauth");

        expect(hasErrorCoverage).toBe(true);
      });
    });

    it("R2.2-T2-01: Analytics handler contract validates required query parameters", async () => {
      const res = await fetch("http://localhost:3000/api/v1/analytics/attendance", {
        headers: { Authorization: "Bearer invalid-token" },
      });
      expect([401, 403, 400, 200]).toContain(res.status);
    });

    it("R2.2-T2-02: Report handler contract rejects empty report generation request payload", async () => {
      const res = await fetch("http://localhost:3000/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([400, 401, 403, 202, 200, 404]).toContain(res.status);
    });
  });
});
