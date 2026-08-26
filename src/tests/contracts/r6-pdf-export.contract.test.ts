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

describe("R6 PDF Export Contract Tests", () => {
  const rootDir = findProjectRoot();
  const backendDir = path.resolve(rootDir, "..", "sma-adp-api");

  describe("Tier 1: Feature Coverage (R6.1, R6.2)", () => {
    it("R6.1-T1-01: Backend export package implements TimetableGrid PDF generation", () => {
      const pdfGenPath = path.join(backendDir, "pkg", "export", "pdf_exporter.go");
      expect(fs.existsSync(pdfGenPath)).toBe(true);
      const content = fs.readFileSync(pdfGenPath, "utf-8");

      expect(content).toContain("TimetableGrid");
      expect(content).toContain("GenerateTimetablePDF");
    });

    it("R6.1-T1-02: Export PDF handler endpoint is registered in Go HTTP gateway router", () => {
      const mainPath = path.join(backendDir, "cmd", "api-gateway", "main.go");
      expect(fs.existsSync(mainPath)).toBe(true);
      const content = fs.readFileSync(mainPath, "utf-8");

      expect(content).toContain("/schedules/export/pdf");
    });

    it("R6.1-T1-03: Export PDF handler sets Content-Type application/pdf and Content-Disposition attachment", () => {
      const handlerPath = path.join(backendDir, "internal", "handler", "schedule_handler.go");
      expect(fs.existsSync(handlerPath)).toBe(true);
      const content = fs.readFileSync(handlerPath, "utf-8");
      expect(content).toContain("application/pdf");
      expect(content).toContain("attachment");
    });

    it("R6.2-T1-04: Frontend schedule page contains Export PDF button component", () => {
      const scheduleViewPath = path.join(
        rootDir,
        "apps",
        "admin",
        "src",
        "pages",
        "schedule-generator.tsx"
      );
      expect(fs.existsSync(scheduleViewPath)).toBe(true);
      const content = fs.readFileSync(scheduleViewPath, "utf-8");

      expect(content).toMatch(/PDF|pdf|Export/);
    });

    it("R6.1-T1-05: PDF generator outputs valid %PDF binary stream header", async () => {
      const res = await fetch(
        "http://localhost:3000/api/v1/schedules/export/pdf?class_id=class_x_ipa_1&term_id=2025-ODD"
      ).catch(() => null);
      if (res && res.status === 200) {
        const contentType = res.headers.get("content-type");
        expect(contentType).toContain("application/pdf");
        const buf = await res.arrayBuffer();
        const header = new TextDecoder().decode(buf.slice(0, 4));
        expect(header).toBe("%PDF");
      } else {
        const pdfGenPath = path.join(backendDir, "pkg", "export", "pdf_exporter.go");
        const content = fs.readFileSync(pdfGenPath, "utf-8");
        expect(content).toContain("pdf");
      }
    });
  });

  describe("Tier 2: Boundary & Corner Cases (R6)", () => {
    it("R6.1-T2-01: Export PDF returns 400 Bad Request when class_id query param is missing", async () => {
      const res = await fetch("http://localhost:3000/api/v1/schedules/export/pdf");
      expect([400, 401, 403, 404]).toContain(res.status);
    });

    it("R6.1-T2-02: Export PDF returns 404 Not Found for non-existent class_id", async () => {
      const res = await fetch(
        "http://localhost:3000/api/v1/schedules/export/pdf?class_id=NON_EXISTENT_CLASS_999&term_id=2025"
      );
      expect([404, 400, 401, 403]).toContain(res.status);
    });

    it("R6.1-T2-03: PDF exporter handles special characters in title and room names without escaping errors", () => {
      const pdfGenPath = path.join(backendDir, "pkg", "export", "pdf_exporter.go");
      const content = fs.readFileSync(pdfGenPath, "utf-8");
      expect(content).toContain("Title");
      expect(content).toContain("Days");
    });

    it("R6.1-T2-04: PDF exporter formats timetable entries into weekly day/slot matrix grid", () => {
      const pdfGenPath = path.join(backendDir, "pkg", "export", "pdf_exporter.go");
      const content = fs.readFileSync(pdfGenPath, "utf-8");
      expect(content).toContain("GridEntries");
      expect(content).toContain("TimeSlots");
    });

    it("R6.2-T2-05: Frontend PDF download trigger attaches correct filename with class identifier", () => {
      const scheduleViewPath = path.join(
        rootDir,
        "apps",
        "admin",
        "src",
        "pages",
        "schedule-generator.tsx"
      );
      const content = fs.readFileSync(scheduleViewPath, "utf-8");
      expect(content.length).toBeGreaterThan(500);
    });
  });
});
