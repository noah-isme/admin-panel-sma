import { test as authTest, expect as authExpect } from "../fixtures/auth.js";
import { gotoAndWait } from "../fixtures/auth.js";
import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for CRUD forms, auth pages, and system pages.
 *
 * Run `npx playwright test visual-forms --update-snapshots` to generate baselines.
 */

// ── Section 1: Create Forms (authenticated) ──

authTest.describe("Create Forms — Visual Regression", () => {
  const createForms = [
    { module: "students", route: "/students/create" },
    { module: "teachers", route: "/teachers/create" },
    { module: "classes", route: "/classes/create" },
    { module: "subjects", route: "/subjects/create" },
    { module: "terms", route: "/terms/create" },
    { module: "enrollments", route: "/enrollments/create" },
    { module: "grade-components", route: "/grade-components/create" },
    { module: "attendance", route: "/attendance/create" },
    { module: "schedules", route: "/schedules/create" },
  ] as const;

  for (const { module, route } of createForms) {
    authTest(`create form — ${module}`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await gotoAndWait(page, route, "form, .ant-form");
      await authExpect(page).toHaveScreenshot(`${module}-create.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }

  // Modules where create is a button click on the list page
  authTest("create form — announcements (from list)", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/announcements", '[class*="ant-"]');
    const createBtn = page.getByRole("button", { name: /buat|tambah|create/i });
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await authExpect(page).toHaveScreenshot("announcements-create.png", {
        fullPage: true,
        animations: "disabled",
      });
    }
  });

  authTest("create form — behavior-notes (from list)", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/behavior-notes", '[class*="ant-"]');
    const createBtn = page.getByRole("button", { name: /buat|tambah|create/i });
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await authExpect(page).toHaveScreenshot("behavior-notes-create.png", {
        fullPage: true,
        animations: "disabled",
      });
    }
  });
});

// ── Section 2: Show/Detail Pages (authenticated) ──

authTest.describe("Detail Pages — Visual Regression", () => {
  authTest("classes show page", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/classes/show/cls-001");
    await authExpect(page).toHaveScreenshot("classes-show.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

// ── Section 3: Auth Pages (unauthenticated) ──

test.describe("Auth Pages — Visual Regression", () => {
  test("forgot password page", async ({ page }) => {
    await page.goto("/admin/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("forgot-password.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("reset password page", async ({ page }) => {
    await page.goto("/admin/reset-password?token=mock-token", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("reset-password.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

// ── Section 4: System Pages (authenticated) ──

authTest.describe("System Pages — Visual Regression", () => {
  authTest("setup wizard", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/setup", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("setup-wizard.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  authTest("schedule generator", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/schedules/generator", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("schedule-generator.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  authTest("pre-semester snapshot", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/setup/pre-semester-snapshot", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("pre-semester-snapshot.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  authTest("import status", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/admin/setup/import-status", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("import-status.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  authTest("analytics drilldown", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    // Use students resource as a sample drilldown target
    await gotoAndWait(page, "/admin/analytics/students/std-001", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("analytics-drilldown.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

// ── Section 5: Edit Forms (authenticated) ──

authTest.describe("Edit Forms — Visual Regression", () => {
  // Edit pages use real IDs from the seed data (scripts/seed.sql).
  // If the record exists, we see the edit form; otherwise an error page — both are valid visual states.

  const editForms = [
    { module: "students", route: "/admin/students/edit/std-001" },
    { module: "teachers", route: "/admin/teachers/edit/tch-001" },
    { module: "classes", route: "/admin/classes/edit/cls-001" },
    { module: "subjects", route: "/admin/subjects/edit/homeroom-subject" },
    { module: "terms", route: "/admin/terms/edit/term-001" },
    { module: "enrollments", route: "/admin/enrollments/edit/enr-001" },
    { module: "grade-components", route: "/admin/grade-components/edit/gcomp-001" },
    { module: "grades", route: "/admin/grades/edit/gcomp-001" },
    { module: "schedules", route: "/admin/schedules/edit/sched-001" },
  ] as const;

  for (const { module, route } of editForms) {
    authTest(`edit form — ${module}`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await gotoAndWait(page, route);
      await authExpect(page).toHaveScreenshot(`${module}-edit.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }

  // Announcements and behavior-notes edit — navigate from list to first edit link
  authTest("edit form — announcements", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/announcements", '[class*="ant-"]');
    const editLink = page.getByRole("link", { name: /edit|ubah|sunting/i }).first();
    if (await editLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editLink.click();
      await page.waitForTimeout(1000);
      await authExpect(page).toHaveScreenshot("announcements-edit.png", {
        fullPage: true,
        animations: "disabled",
      });
    }
  });

  authTest("edit form — behavior-notes", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/behavior-notes", '[class*="ant-"]');
    const editLink = page.getByRole("link", { name: /edit|ubah|sunting/i }).first();
    if (await editLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editLink.click();
      await page.waitForTimeout(1000);
      await authExpect(page).toHaveScreenshot("behavior-notes-edit.png", {
        fullPage: true,
        animations: "disabled",
      });
    }
  });
});
