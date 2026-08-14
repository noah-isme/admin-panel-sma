import { defineConfig, devices } from "@playwright/test";

const staged = process.env.PORTAL_STAGED === "1";
const baseURL = process.env.PORTAL_STAGING_URL ?? "http://localhost:5175";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: staged
    ? undefined
    : {
        // Invoke the local binary directly so CI and restricted environments do
        // not depend on pnpm's global store/database being available.
        command: "node_modules/.bin/vite --host 127.0.0.1 --port 5175",
        url: "http://localhost:5175",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
