import { test, expect } from "../fixtures/auth.js";
import { gotoAndWait } from "../fixtures/auth.js";

/**
 * Visual regression tests for every admin module list/index page.
 *
 * Run `npx playwright test visual-modules --update-snapshots` to generate baselines.
 * Baselines are committed to visual-modules.spec.ts-snapshots/.
 */

test.describe("Module List Pages — Visual Regression", () => {
  // ── Always-enabled modules ──

  test("students list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/students", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("students-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("teachers list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/teachers", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("teachers-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("classes list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/classes", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("classes-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("subjects list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/subjects", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("subjects-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("terms list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/terms", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("terms-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("enrollments list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/enrollments", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("enrollments-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grade-components list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/grade-components", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grade-components-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grade-configs page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/grade-configs", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grade-configs.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grades list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/grades", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grades-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("grades analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/grades/analytics", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("grades-analytics.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("announcements list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/announcements", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("announcements-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("behavior-notes list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/behavior-notes", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("behavior-notes-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("behavior-notes analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/behavior-notes/analytics", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("behavior-analytics.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("users list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/users", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("users-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  // ── Feature-flagged modules ──

  test("calendar page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/calendar", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("calendar.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/attendance", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance daily", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/attendance/daily", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-daily.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("attendance lesson", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/attendance/lesson", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("attendance-lesson.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("homerooms list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/homerooms", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("homerooms-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("schedules list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/schedules", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("schedules-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("schedules preferences", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/schedules/preferences", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("schedules-preferences.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("configuration page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/configuration", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("configuration.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("mutations list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/mutations", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("mutations-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("archives list", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/archives", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("archives-list.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("reports page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/reports", '[class*="ant-"]');
    await expect(page).toHaveScreenshot("reports-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

test.describe("Module List Pages — Mobile Visual", () => {
  const mobilePriority = [
    { module: "students", route: "/admin/students" },
    { module: "teachers", route: "/admin/teachers" },
    { module: "grades", route: "/admin/grades" },
    { module: "attendance", route: "/admin/attendance" },
  ] as const;

  for (const { module, route } of mobilePriority) {
    test(`mobile — ${module} list`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoAndWait(page, route, '[class*="ant-"]');
      await expect(page).toHaveScreenshot(`${module}-mobile.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
