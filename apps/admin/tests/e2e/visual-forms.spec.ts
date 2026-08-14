import { test as authTest, expect as authExpect } from "../fixtures/auth";
import { gotoAndWait } from "../fixtures/auth";
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
      await page.waitForLoadState("networkidle");
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
      await page.waitForLoadState("networkidle");
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
    await gotoAndWait(page, "/classes", ".ant-table");
    const showLink = page.getByRole("link", { name: /lihat|show|detail/i }).first();
    if (await showLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await showLink.click();
      await page.waitForLoadState("networkidle");
      await authExpect(page).toHaveScreenshot("classes-show.png", {
        fullPage: true,
        animations: "disabled",
      });
    }
  });
});

// ── Section 3: Auth Pages (unauthenticated) ──

test.describe("Auth Pages — Visual Regression", () => {
  test("forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("forgot-password.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("reset password page", async ({ page }) => {
    await page.goto("/reset-password?token=mock-token");
    await page.waitForLoadState("networkidle");
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
    await gotoAndWait(page, "/setup", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("setup-wizard.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  authTest("schedule generator", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await gotoAndWait(page, "/schedules/generator", '[class*="ant-"]');
    await authExpect(page).toHaveScreenshot("schedule-generator.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
