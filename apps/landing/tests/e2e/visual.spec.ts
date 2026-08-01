import { test, expect } from "@playwright/test";

test.describe("Landing App Visual Tests", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Take screenshot with lenient comparison
    await expect(page).toHaveScreenshot("homepage.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.05,
    });
  });

  test("mobile viewport homepage", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for animations to complete
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("homepage-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.05,
    });
  });
});
