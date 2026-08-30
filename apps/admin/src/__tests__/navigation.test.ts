import { describe, expect, it } from "vitest";

import { getSafeInternalRoute, isSafeInternalRoute } from "../utils/navigation.js";

describe("setup summary navigation", () => {
  it.each(["/terms", "/students"])("accepts the allowlisted route %s", (route) => {
    expect(isSafeInternalRoute(route)).toBe(true);
    expect(getSafeInternalRoute(route)).toBe(route);
  });

  it.each(["/\\\\example.test", "/students\\\\..\\\\login", "/students%5C%5C..%5Clogin"])(
    "rejects backslash-based route %s",
    (route) => {
      expect(isSafeInternalRoute(route)).toBe(false);
      expect(getSafeInternalRoute(route)).toBe("/");
    }
  );

  it.each(["//example.test", "///example.test"])("rejects protocol-relative route %s", (route) => {
    expect(isSafeInternalRoute(route)).toBe(false);
    expect(getSafeInternalRoute(route)).toBe("/");
  });

  it.each([
    "https://example.test",
    "http://example.test",
    "javascript:alert(1)",
    "data:text/html,attack",
  ])("rejects external or scheme-based route %s", (route) => {
    expect(isSafeInternalRoute(route)).toBe(false);
    expect(getSafeInternalRoute(route)).toBe("/");
  });

  it.each([undefined, null, "", "/dashboard", "/terms?next=//example.test", "/terms#external"])(
    "falls back for non-allowlisted destination %s",
    (route) => {
      expect(isSafeInternalRoute(route)).toBe(false);
      expect(getSafeInternalRoute(route)).toBe("/");
    }
  );
});
