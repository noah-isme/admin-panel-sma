import { test } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test("take screenshots of multiple pages", async ({ page }) => {
  const pagesToTest = [
    { name: "main", path: "/admin/" },
    { name: "students", path: "/admin/students" },
    { name: "teachers", path: "/admin/teachers" },
    { name: "classes", path: "/admin/classes" },
  ];

  for (const p of pagesToTest) {
    // Navigate to the page
    await page.goto(p.path);

    // Wait for the page to render
    await page.waitForTimeout(3000);

    // Take a full page screenshot
    await page.screenshot({ path: `${p.name}-page-screenshot.png`, fullPage: true });
  }
});
