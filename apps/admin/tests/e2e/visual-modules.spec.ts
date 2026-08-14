import { test, expect } from "../fixtures/auth";
import { gotoAndWait } from "../fixtures/auth";

/**
 * Visual regression tests for every admin module list/index page.
 *
 * Run `npx playwright test visual-modules --update-snapshots` to generate baselines.
 * Baselines are committed to visual-modules.spec.ts-snapshots/.
 */

test.describe("Module List Pages — Visual Regression", () => {
  // ── Always-enabled modules ──

  test("subjects list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/subjects", ".ant-table");
    await expect(page).toHaveScreenshot("subjects-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("terms list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/terms", ".ant-table");
    await expect(page).toHaveScreenshot("terms-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("enrollments list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/enrollments", ".ant-table");
    await expect(page).toHaveScreenshot("enrollments-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grade-components list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/grade-components", ".ant-table");
    await expect(page).toHaveScreenshot("grade-components-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grade-configs page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/grade-configs", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grade-configs.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grades list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/grades", ".ant-table");
    await expect(page).toHaveScreenshot("grades-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grades analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/grades/analytics", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grades-analytics.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("announcements list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/announcements", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("announcements-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("behavior-notes list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/behavior-notes", ".ant-table");
    await expect(page).toHaveScreenshot("behavior-notes-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("behavior-notes analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/behavior-notes/analytics", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("behavior-analytics.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("users list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/users", ".ant-table");
    await expect(page).toHaveScreenshot("users-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  // ── Feature-flagged modules ──

  test("calendar page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/calendar", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("calendar.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/attendance", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance daily", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/attendance/daily", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-daily.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance lesson", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/attendance/lesson", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-lesson.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("homerooms list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/homerooms", ".ant-table");
    await expect(page).toHaveScreenshot("homerooms-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("schedules preferences", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/schedules/preferences", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("schedules-preferences.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("configuration page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/configuration", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("configuration.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("mutations list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/mutations", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("mutations-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("archives list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/archives", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("archives-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("reports page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/reports", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("reports-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

test.describe("Module List Pages — Mobile Visual", () => {
  test.beforeEach(async ({}, testInfo) => {
    testInfo.project.use.viewport = { width: 375, height: 667 };
  });

  const mobilePriority = [
    { module: "students", route: "/students", selector: ".ant-table" },
    { module: "teachers", route: "/teachers", selector: ".ant-table" },
    { module: "grades", route: "/grades", selector: ".ant-table" },
    { module: "attendance", route: "/attendance", selector: '[class*="ant-"]' },
  ] as const;

  for (const { module, route, selector } of mobilePriority) {
    test(`mobile — ${module} list`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoAndWait(page, route, selector);
      await expect(page).toHaveScreenshot(`${module}-mobile.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
