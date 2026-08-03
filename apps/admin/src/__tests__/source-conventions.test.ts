import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guards for API misuse that typechecking alone did not catch for a long
 * time, because `pnpm typecheck` compiled nothing. Each of these was a real
 * runtime bug found in this codebase, so they are asserted against the source
 * rather than trusted to a reviewer's memory.
 */

const SRC = join(__dirname, "..");

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const sourceFiles = collectSourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  text: readFileSync(path, "utf8"),
}));

describe("source conventions", () => {
  it("finds source files to scan", () => {
    // Guards against the traversal silently returning nothing, which would make
    // every assertion below vacuously pass.
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it("never calls CRUD methods on the useDataProvider getter", () => {
    // `useDataProvider()` returns `(name?) => DataProvider`. Reaching for
    // `.update`/`.create`/`.custom` on it throws "is not a function".
    const offenders = sourceFiles
      .filter(({ text }) => /=\s*useDataProvider\(\)/.test(text))
      .filter(({ text }) => {
        const local = /const\s+(\w+)\s*=\s*useDataProvider\(\)/.exec(text)?.[1];
        if (!local) return false;
        return new RegExp(`\\b${local}\\.(create|update|deleteOne|getOne|getList|custom)\\b`).test(
          text
        );
      })
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("does not use dayjs plugin methods without registering the plugin", () => {
    // These live on optional plugins. Calling them on core dayjs throws.
    const PLUGIN_METHODS = ["isSameOrBefore", "isSameOrAfter", "isBetween", "weekday"];
    const offenders = sourceFiles
      .filter(({ text }) => !text.includes("dayjs/plugin/"))
      .flatMap(({ path, text }) =>
        PLUGIN_METHODS.filter((method) => text.includes(`.${method}(`)).map(
          (method) => `${path}: ${method}`
        )
      );

    expect(offenders).toEqual([]);
  });

  it("passes queryOptions inside the useCan props object", () => {
    // `useCan` takes a single argument. A second one is silently ignored, so an
    // `enabled: false` guard there does nothing and the query fires anyway.
    // Brace-counted rather than regexed, since the props object is multi-line
    // and itself contains a nested `queryOptions: { ... }`.
    const hasSecondArgument = (text: string): boolean => {
      for (
        let index = text.indexOf("useCan(");
        index !== -1;
        index = text.indexOf("useCan(", index + 1)
      ) {
        let cursor = index + "useCan(".length;
        while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
        if (text[cursor] !== "{") continue;
        let depth = 0;
        for (; cursor < text.length; cursor += 1) {
          if (text[cursor] === "{") depth += 1;
          else if (text[cursor] === "}") {
            depth -= 1;
            if (depth === 0) break;
          }
        }
        cursor += 1;
        while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
        if (text[cursor] === ",") return true;
      }
      return false;
    };

    const offenders = sourceFiles
      .filter(({ text }) => hasSecondArgument(text))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("does not pass a behavior argument to setSorters", () => {
    // Unlike `setFilters`, `setSorters` takes only the sorter array.
    const offenders = sourceFiles
      .filter(({ text }) => /setSorters\??\.?\(\s*\[[^\]]*\]\s*,/.test(text))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("does not re-introduce ambient shims for packages that ship types", () => {
    // `declare module "msw"` replaces the real declarations instead of merging,
    // which hid msw v2's entire API behind stale v1 `any`s.
    const offenders = sourceFiles
      .filter(({ text }) => /declare module "(msw|@refinedev|antd|dayjs)/.test(text))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("reads term active state through the shared helper", () => {
    // The API sends `is_active`, normalized to `isActive`. `term.active` is
    // always undefined and silently falls back to the first term.
    // `mocks/` is exempt: the fixtures define the legacy `active` field that
    // `isTermActive` reads, so they are the one place allowed to touch it.
    const offenders = sourceFiles
      .filter(({ path }) => path !== join("utils", "terms.ts") && !path.startsWith("mocks"))
      .filter(({ text }) => /\b(term|activeTerm|t)\.active\b/.test(text))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
