import { describe, expect, it } from "vitest";

import {
  ACTIVE_TERM_FILTER_FIELD,
  DEFAULT_TERM_TYPE,
  buildTermPayload,
  deriveAcademicYear,
  isTermActive,
  resolveActiveTerm,
  toApiDate,
} from "../utils/terms";

describe("isTermActive", () => {
  it("accepts the API flag", () => {
    expect(isTermActive({ isActive: true })).toBe(true);
  });

  it("accepts the legacy fixture flag", () => {
    expect(isTermActive({ active: true })).toBe(true);
  });

  it("rejects a term flagged inactive under both names", () => {
    expect(isTermActive({ active: false, isActive: false })).toBe(false);
  });

  it("rejects a term with no flag at all", () => {
    expect(isTermActive({})).toBe(false);
  });
});

describe("resolveActiveTerm", () => {
  it("returns null for an empty or missing list", () => {
    expect(resolveActiveTerm([])).toBeNull();
    expect(resolveActiveTerm(undefined)).toBeNull();
    expect(resolveActiveTerm(null)).toBeNull();
  });

  it("picks the term the API flagged active, not the first one", () => {
    const terms = [
      { id: "genap", isActive: false },
      { id: "ganjil", isActive: true },
    ];
    expect(resolveActiveTerm(terms)?.id).toBe("ganjil");
  });

  it("picks the term the fixtures flagged active", () => {
    const terms = [
      { id: "genap", active: false },
      { id: "ganjil", active: true },
    ];
    expect(resolveActiveTerm(terms)?.id).toBe("ganjil");
  });

  it("falls back to the first term when none is flagged", () => {
    const terms: Array<{ id: string; isActive?: boolean }> = [{ id: "first" }, { id: "second" }];
    expect(resolveActiveTerm(terms)?.id).toBe("first");
  });
});

describe("ACTIVE_TERM_FILTER_FIELD", () => {
  it("matches the query parameter the API parses", () => {
    // internal/handler/term_handler.go reads c.Query("isActive"); an `active`
    // filter is silently ignored and returns every term.
    expect(ACTIVE_TERM_FILTER_FIELD).toBe("isActive");
  });
});

describe("toApiDate", () => {
  it("widens a plain date to an RFC3339 instant", () => {
    // The Go DTO binds into time.Time, which rejects a bare YYYY-MM-DD.
    expect(toApiDate("2025-07-01")).toBe("2025-07-01T00:00:00Z");
  });

  it("leaves an instant alone", () => {
    expect(toApiDate("2025-07-01T00:00:00Z")).toBe("2025-07-01T00:00:00Z");
  });

  it("returns undefined for empty input", () => {
    expect(toApiDate("")).toBeUndefined();
    expect(toApiDate(null)).toBeUndefined();
    expect(toApiDate(undefined)).toBeUndefined();
  });

  it("returns undefined for unparseable input", () => {
    expect(toApiDate("not-a-date")).toBeUndefined();
  });

  it("accepts a dayjs-like object", () => {
    expect(toApiDate({ toISOString: () => "2025-07-01T00:00:00.000Z" })).toBe(
      "2025-07-01T00:00:00.000Z"
    );
  });
});

describe("deriveAcademicYear", () => {
  it("treats July onwards as the start of the school year", () => {
    expect(deriveAcademicYear("2025-07-01")).toBe("2025/2026");
    expect(deriveAcademicYear("2025-12-31")).toBe("2025/2026");
  });

  it("treats January to June as the tail of the previous school year", () => {
    expect(deriveAcademicYear("2026-01-06")).toBe("2025/2026");
    expect(deriveAcademicYear("2026-06-30")).toBe("2025/2026");
  });

  it("returns undefined without a usable date", () => {
    expect(deriveAcademicYear(undefined)).toBeUndefined();
  });
});

describe("buildTermPayload", () => {
  it("fills the fields the API requires but the form omits", () => {
    const payload = buildTermPayload({
      name: "  Semester Ganjil  ",
      startDate: "2025-07-01",
      endDate: "2025-12-31",
      active: true,
    });

    expect(payload).toEqual({
      name: "Semester Ganjil",
      type: DEFAULT_TERM_TYPE,
      academicYear: "2025/2026",
      startDate: "2025-07-01T00:00:00Z",
      endDate: "2025-12-31T00:00:00Z",
      isActive: true,
    });
  });

  it("renames the legacy active flag to the API's is_active", () => {
    // The dataProvider snake_cases on the way out, so isActive -> is_active.
    expect(buildTermPayload({ active: true }).isActive).toBe(true);
    expect(buildTermPayload({ active: false }).isActive).toBe(false);
    expect(buildTermPayload({}).isActive).toBe(false);
  });

  it("prefers an explicit isActive over the legacy flag", () => {
    expect(buildTermPayload({ active: false, isActive: true }).isActive).toBe(true);
  });

  it("keeps an explicit type and academic year", () => {
    const payload = buildTermPayload({
      type: "TRIMESTER",
      academicYear: "2030/2031",
      startDate: "2025-07-01",
    });
    expect(payload.type).toBe("TRIMESTER");
    expect(payload.academicYear).toBe("2030/2031");
  });
});
