import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = "playwright/.auth/user.json";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Login to get tokens
    await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });

    // Wait for login form
    await page.getByRole("textbox", { name: /email/i }).fill("superadmin@sma.test");
    await page.getByRole("textbox", { name: /password/i }).fill("admin123");

    // Wait for login response
    const loginResponse = page.waitForResponse(
      (r) => r.url().includes("/auth/login") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /login|masuk/i }).click();
    const response = await loginResponse;

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }

    const body = await response.json();
    const accessToken = body.data?.access_token;
    const refreshToken = body.data?.refresh_token;

    if (!accessToken) {
      throw new Error("No access token in login response");
    }

    // Store auth state
    const storage = await page.context().storageState();
    fs.writeFileSync(AUTH_FILE, JSON.stringify(storage, null, 2));

    console.log("✅ Staged auth fixtures created");
  } finally {
    await browser.close();
  }
}

export default globalSetup;
