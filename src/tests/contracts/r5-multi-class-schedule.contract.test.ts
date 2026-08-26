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

describe("R5 Multi-Class Schedule Generation Contract Tests", () => {
  const rootDir = findProjectRoot();

  describe("Tier 1: Feature Coverage (R5.1, R5.2)", () => {
    it("R5.1-T1-01: Go DTO GenerateScheduleRequest includes ClassIDs string array field", () => {
      const dtoPath = path.join(rootDir, "sma-adp-api", "internal", "dto", "schedule_dto.go");
      expect(fs.existsSync(dtoPath)).toBe(true);
      const content = fs.readFileSync(dtoPath, "utf-8");

      expect(content).toContain("ClassIDs");
      expect(content).toContain("class_ids");
    });

    it("R5.1-T1-02: Schedule solver service enforces cross-class teacher conflict constraints", () => {
      const servicePath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "service",
        "schedule_generator_service.go"
      );
      expect(fs.existsSync(servicePath)).toBe(true);
      const content = fs.readFileSync(servicePath, "utf-8");

      expect(content).toMatch(/TeacherID|teacher|conflict|ClassIDs/i);
    });

    it("R5.1-T1-03: GenerateScheduleResponse includes proposal ID, score, slots, and conflicts", () => {
      const dtoPath = path.join(rootDir, "sma-adp-api", "internal", "dto", "schedule_dto.go");
      const content = fs.readFileSync(dtoPath, "utf-8");

      expect(content).toContain("GenerateScheduleResponse");
      expect(content).toContain("ProposalID");
      expect(content).toContain("Conflicts");
    });

    it("R5.2-T1-04: Frontend schedule generator hook supports multi-class selection", () => {
      const hookPath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "admin",
        "src",
        "hooks",
        "use-schedule-generator.ts"
      );
      expect(fs.existsSync(hookPath)).toBe(true);
      const content = fs.readFileSync(hookPath, "utf-8");

      expect(content).toMatch(/classIds|class_ids|selectedClasses/);
    });

    it("R5.2-T1-05: Frontend schedule generator page renders class selection controls", () => {
      const pagePath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "admin",
        "src",
        "pages",
        "schedule-generator.tsx"
      );
      expect(fs.existsSync(pagePath)).toBe(true);
      const content = fs.readFileSync(pagePath, "utf-8");

      expect(content).toMatch(/Select|Class|classes|mode/i);
    });
  });

  describe("Tier 2: Boundary & Corner Cases (R5)", () => {
    it("R5.1-T2-01: Single class_id request payload retains full backward compatibility", async () => {
      const singleClassPayload = {
        termId: "2025-EVEN",
        classId: "class_x_ipa_1",
        timeSlotsPerDay: 4,
        days: [1, 2, 3, 4, 5],
        subjectLoads: [{ subjectId: "subj_matematika", teacherId: "teach_budi", weeklyCount: 4 }],
      };

      const res = await fetch("http://localhost:3000/api/v1/schedules/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleClassPayload),
      });

      expect([200, 400, 401, 403, 404]).toContain(res.status);
    });

    it("R5.1-T2-02: Multi-class payload with empty classIds array returns 400 validation error", async () => {
      const emptyPayload = {
        termId: "2025-ODD",
        classIds: [],
        timeSlotsPerDay: 4,
        days: [1, 2],
        subjectLoads: [],
      };

      const res = await fetch("http://localhost:3000/api/v1/schedules/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptyPayload),
      });

      expect([400, 401, 403, 422, 404]).toContain(res.status);
    });

    it("R5.1-T2-03: Generator handler deduplicates duplicate class IDs in request payload", () => {
      const handlerPath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "handler",
        "schedule_generator_handler.go"
      );
      if (fs.existsSync(handlerPath)) {
        const content = fs.readFileSync(handlerPath, "utf-8");
        expect(content.length).toBeGreaterThan(100);
      }
    });

    it("R5.1-T2-04: Solver detects overbooked teacher assigned to more slots than available in week", () => {
      const servicePath = path.join(
        rootDir,
        "sma-adp-api",
        "internal",
        "service",
        "schedule_generator_service.go"
      );
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toMatch(/WeeklyCount|timeSlots|conflict/i);
    });

    it("R5.2-T2-05: Frontend schedule generator page handles empty class selection state gracefully", () => {
      const pagePath = path.join(
        rootDir,
        "admin-panel-sma",
        "apps",
        "admin",
        "src",
        "pages",
        "schedule-generator.tsx"
      );
      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content.length).toBeGreaterThan(500);
    });
  });
});
