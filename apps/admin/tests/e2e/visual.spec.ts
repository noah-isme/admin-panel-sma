import { test, expect } from "@playwright/test";

test.describe("Admin App Visual Tests", () => {
  test("homepage loads and matches snapshot", async ({ page }) => {
    await page.goto("/admin/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("homepage.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("login page loads and matches snapshot", async ({ page }) => {
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("login-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("dashboard loads and matches snapshot", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("dashboard.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("mobile viewport homepage", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/admin/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root, [class*='ant-']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("homepage-mobile.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
