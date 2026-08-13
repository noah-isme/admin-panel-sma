import { describe, expect, it } from "vitest";
import { buildAnalyticsQuery, normalizeAnalyticsPayload } from "../hooks/use-analytics-drilldown";

describe("analytics drilldown contract", () => {
  it("builds the required snake_case query parameters", () => {
    expect(buildAnalyticsQuery({ termId: "term-1", classId: "class-1", limit: 25 })).toEqual({
      term_id: "term-1",
      class_id: "class-1",
      limit: "25",
    });
    expect(buildAnalyticsQuery({ termId: "term-1" })).toEqual({ term_id: "term-1" });
  });

  it("normalizes nested snake_case responses for typed pages", () => {
    expect(
      normalizeAnalyticsPayload({
        class_id: "class-1",
        subject_performance: [{ average_grade: 81.5 }],
      })
    ).toEqual({
      classId: "class-1",
      subjectPerformance: [{ averageGrade: 81.5 }],
    });
  });
});
