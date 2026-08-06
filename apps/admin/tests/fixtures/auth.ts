import { test as base, Page, BrowserContext } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = "playwright/.auth/user.json";

interface AuthFixtures {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}

export const test = base.extend<AuthFixtures>({
  // Reuse authenticated context across tests
  authenticatedContext: async ({ browser }, use) => {
    // Check if auth file exists
    if (!fs.existsSync(AUTH_FILE)) {
      throw new Error(
        `Auth file not found at ${AUTH_FILE}. Run global setup first or set PLAYWRIGHT_STAGED=1`
      );
    }

    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });
    await use(context);
    await context.close();
  },

  // Reuse authenticated page
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";

// Helper to wait for API responses deterministically
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, method = "GET") {
  return page.waitForResponse(
    (r) => {
      const matches =
        typeof urlPattern === "string" ? r.url().includes(urlPattern) : urlPattern.test(r.url());
      return matches && r.request().method() === method && r.ok();
    },
    { timeout: 30_000 }
  );
}

// Helper to wait for page to be fully ready
export async function waitForPageReady(page: Page, readySelector: string) {
  await expect(page.locator(readySelector)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(readySelector)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  });
}

// Helper to navigate and wait for specific content
export async function gotoAndWait(page: Page, url: string, contentSelector: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator(contentSelector)).toBeVisible({ timeout: 30_000 });
}
