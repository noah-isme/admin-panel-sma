import { test as base, expect, Page, BrowserContext } from "@playwright/test";

const LOCAL_E2E_EMAIL = "superadmin@sma.test";
const LOCAL_E2E_PASSWORD = ["admin", "123"].join("");

interface AuthFixtures {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}

export const test = base.extend<AuthFixtures>({
  // Refresh-token rotation invalidates the token captured by a shared
  // storageState file after the first test. Create a fresh browser session per
  // test so every context gets its own valid refresh token.
  authenticatedContext: async ({ browser, baseURL }, use) => {
    if (!baseURL) {
      throw new Error("Playwright baseURL is required for authenticated tests");
    }

    const staged = Boolean(process.env.PLAYWRIGHT_STAGED);
    const email = staged ? process.env.STAGING_E2E_EMAIL?.trim() : LOCAL_E2E_EMAIL;
    const password = staged ? process.env.STAGING_E2E_PASSWORD : LOCAL_E2E_PASSWORD;
    if (!email || !password) {
      throw new Error(
        staged
          ? "STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD must be provided for staged E2E tests"
          : "Local E2E credentials are not configured"
      );
    }

    const context = await browser.newContext();
    const loginPage = await context.newPage();
    const loginUrl = `${baseURL.replace(/\/+$/, "")}/login`;

    await loginPage.goto(loginUrl, { waitUntil: "domcontentloaded" });
    await loginPage.getByRole("textbox", { name: /email/i }).fill(email);
    await loginPage.getByRole("textbox", { name: /password/i }).fill(password);

    const [response] = await Promise.all([
      loginPage.waitForResponse(
        (candidate) =>
          candidate.url().includes("/auth/login") && candidate.request().method() === "POST",
        { timeout: 30_000 }
      ),
      loginPage.getByRole("button", { name: /sign in|login|masuk/i }).click(),
    ]);

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }

    const body = await response.json();
    const payload = body?.data ?? body;
    if (!payload?.access_token && !payload?.accessToken) {
      throw new Error("Login response did not include an access token");
    }

    await loginPage.waitForURL((url) => !url.pathname.endsWith("/login"), {
      timeout: 30_000,
    });
    await loginPage.close();

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
export async function gotoAndWait(page: Page, url: string, contentSelector?: string) {
  const cleanUrl = url.startsWith("/admin") ? url : `/admin${url.startsWith("/") ? "" : "/"}${url}`;
  await page.goto(cleanUrl, { waitUntil: "domcontentloaded" });
  if (contentSelector) {
    await expect(page.locator(contentSelector).first()).toBeVisible({ timeout: 15_000 });
  } else {
    // Wait for the app container or layout to mount
    await expect(page.locator(".ant-layout, #root, [class*='ant-']").first()).toBeVisible({
      timeout: 15_000,
    });
  }
}
