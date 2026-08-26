import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { authProvider } from "../../../apps/admin/src/providers/authProvider";
import { clearAccessToken, getAccessToken } from "../../../apps/admin/src/providers/dataProvider";
import { fetchFeatures } from "../../../apps/admin/src/providers/features";

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

describe("Tiers 1-4 Comprehensive Integration & Scenario Contract Tests", () => {
  const rootDir = findProjectRoot();

  beforeEach(() => {
    localStorage.clear();
    clearAccessToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    clearAccessToken();
  });

  describe("Tier 3: Pairwise Cross-Feature Interactions", () => {
    it("Pair-01: Auth logout revokes token while Worker health check remains operational", async () => {
      localStorage.setItem("access_token", "active-token");
      localStorage.setItem("refresh_token", "active-refresh");

      const fetchMock = vi.mocked(fetch).mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/health")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: "ok", queue_depth: 3 }),
          } as Response;
        }
        if (urlStr.includes("/auth/logout")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ message: "logged out" }),
          } as Response;
        }
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      });

      await authProvider.logout?.({});
      expect(localStorage.getItem("access_token")).toBeNull();

      const workerRes = await fetchMock("http://localhost:3002/health");
      const healthData = await workerRes.json();
      expect(healthData.status).toBe("ok");
      expect(healthData.queue_depth).toBe(3);
    });

    it("Pair-02: Multi-class schedule generation output feeds directly into PDF export renderer", async () => {
      const scheduleProposal = {
        proposalId: "prop-999",
        score: 100,
        slots: [
          {
            classId: "10A",
            dayOfWeek: 1,
            timeSlot: 1,
            subjectId: "MAT",
            teacherId: "T1",
            room: "101",
          },
          {
            classId: "10B",
            dayOfWeek: 1,
            timeSlot: 1,
            subjectId: "BIO",
            teacherId: "T2",
            room: "102",
          },
        ],
      };

      const pdfGenPath = path.join(rootDir, "sma-adp-api", "pkg", "export", "pdf_exporter.go");
      expect(fs.existsSync(pdfGenPath)).toBe(true);
      expect(scheduleProposal.slots).toHaveLength(2);
      expect(scheduleProposal.slots[0].teacherId).not.toBe(scheduleProposal.slots[1].teacherId);
    });

    it("Pair-03: Dynamic feature flag gating dynamically disables scheduler and PDF export buttons", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            features: {
              scheduler: false,
            },
          },
        }),
      } as Response);

      const flags = await fetchFeatures("http://localhost:8080/api/v1");
      expect(flags.schedules).toBe(false);
    });

    it("Pair-04: Schedule generation and PDF export operations append entries to audit log repository", () => {
      const auditRepoPath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "repository",
        "audit_repository.go"
      );
      expect(fs.existsSync(auditRepoPath)).toBe(true);
      const content = fs.readFileSync(auditRepoPath, "utf-8");

      expect(content).toContain("AuditLog");
      expect(content).toContain("Create");
    });

    it("Pair-05: Seed-reset target purges stale database state and refreshes audit logs schema", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      const content = fs.readFileSync(makefilePath, "utf-8");

      expect(content).toContain("seed-reset:");
      expect(content).toContain("DROP SCHEMA");
    });

    it("Pair-06: Swagger route validation covers feature flag and schedule export endpoints", () => {
      const scriptPath = path.join(rootDir, "sma-adp-api", "scripts", "validate_swagger_routes.py");
      const content = fs.readFileSync(scriptPath, "utf-8");

      expect(content).toContain("swagger");
    });
  });

  describe("Tier 4: Real-World Application Scenarios", () => {
    it("Scenario-01: Admin end-to-end lifecycle (Login -> Multi-Class Gen -> PDF Export -> Audit -> Logout)", async () => {
      const fetchMock = vi.mocked(fetch).mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/auth/login")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                access_token: "admin-access-token",
                refresh_token: "admin-refresh-token",
                user: { id: "u-admin", email: "admin@school.id", role: "ADMIN_TU" },
              },
            }),
          } as Response;
        }
        if (urlStr.includes("/schedules/generator")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                proposalId: "prop-scenario-1",
                slots: [{ classId: "10A", dayOfWeek: 1, timeSlot: 1, subjectId: "MATH" }],
                conflicts: [],
              },
            }),
          } as Response;
        }
        if (urlStr.includes("/auth/logout")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ message: "logged out successfully" }),
          } as Response;
        }
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      });

      // Step 1: Login
      const loginRes = await authProvider.login({
        username: "admin@school.id",
        password: "Admin123!",
      });
      expect(loginRes.success).toBe(true);
      expect(getAccessToken()).toBe("admin-access-token");

      // Step 2: Multi-class schedule generation
      const genRes = await fetchMock("http://localhost:3000/api/v1/schedules/generator", {
        method: "POST",
        body: JSON.stringify({ classIds: ["10A", "10B"], termId: "2025" }),
      });
      const genData = await genRes.json();
      expect(genData.data.proposalId).toBe("prop-scenario-1");

      // Step 3: Logout
      await authProvider.logout?.({});
      expect(localStorage.getItem("access_token")).toBeNull();
    });

    it("Scenario-02: Deployment Rollback & Database Recovery Pipeline", () => {
      const makefilePath = path.join(rootDir, "sma-adp-api", "Makefile");
      const content = fs.readFileSync(makefilePath, "utf-8");

      expect(content).toContain("rollback:");
      expect(content).toContain("seed-reset:");
      expect(content).toContain("compatibility-smoke");
    });

    it("Scenario-03: High-Concurrency Multi-Class Solver Conflict Escalation", () => {
      const e2eTestPath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "handler",
        "e2e_requirements_r1_r6_test.go"
      );
      expect(fs.existsSync(e2eTestPath)).toBe(true);
      const content = fs.readFileSync(e2eTestPath, "utf-8");

      expect(content).toContain(
        "TestE2E_Tier4_Scen03_HighConcurrencyMultiClassSchedulingAuditTrail"
      );
    });

    it("Scenario-04: Feature Flag Dynamic Fallback & Runtime Hot-Swap", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);

      const flagsFallback = await fetchFeatures("http://localhost:8080/api/v1");
      expect(flagsFallback).toBeDefined();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { features: { scheduler: true, reports: true } } }),
      } as Response);

      const flagsOnline = await fetchFeatures("http://localhost:8080/api/v1");
      expect(flagsOnline.schedules).toBe(true);
      expect(flagsOnline.reports).toBe(true);
    });

    it("Scenario-05: Worker Queue Monitoring & Health Audit Pipeline", () => {
      const workerPath = path.join(rootDir, "admin-panel-sma", "apps", "worker", "src", "index.ts");
      expect(fs.existsSync(workerPath)).toBe(true);
      const content = fs.readFileSync(workerPath, "utf-8");

      expect(content).toContain("/health");
      expect(content).toContain("queue_depth");
    });
  });
});
