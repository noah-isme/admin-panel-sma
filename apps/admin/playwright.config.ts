import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isStaged = !!process.env.PLAYWRIGHT_STAGED;

// Staged environment uses deployed URL, local uses dev server
const baseURL = isStaged
  ? process.env.PLAYWRIGHT_BASE_URL || "https://admin-sma-staging.vercel.app/admin"
  : "http://localhost:5173/admin";

const apiURL = isStaged
  ? process.env.PLAYWRIGHT_API_URL || "https://api-sma-staging.railway.app/api/v1"
  : "http://localhost:8081/api/v1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Single worker in CI to avoid test data collisions
  workers: isCI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: {
    // Default assertion timeout - reduced from 5s to fail faster
    timeout: 10_000,
    // Disable animations for visual comparisons
    toHaveScreenshot: { animations: "disabled" },
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Disable auto-wait for networkidle - use deterministic assertions instead
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Only start webServer for local development
  webServer: isStaged
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:5173",
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          VITE_API_URL: apiURL,
          VITE_USE_MSW: "false",
          // Enable all feature flags for full E2E coverage
          VITE_ENABLE_DASHBOARD: "true",
          VITE_ENABLE_SCHEDULER: "true",
          VITE_ENABLE_REPORTS: "true",
          VITE_ENABLE_ATTENDANCE_ALIAS: "true",
          VITE_ENABLE_MUTATIONS: "true",
          VITE_ENABLE_ARCHIVES: "true",
          VITE_ENABLE_HOMEROOMS: "true",
          VITE_ENABLE_CALENDAR_ALIAS: "true",
          VITE_ENABLE_CONFIGURATION_API: "true",
        },
      },
  // Global setup for auth fixtures
  globalSetup: isStaged ? "./tests/global-setup.staged.ts" : "./tests/global-setup.local.ts",
  globalTeardown: isStaged ? "./tests/global-teardown.staged.ts" : undefined,
});
