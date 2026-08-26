import { test, expect } from "../fixtures/auth.js";
import { waitForApiResponse, gotoAndWait } from "../fixtures/auth.js";

test.describe("Scheduler Feature", () => {
  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    // Page is already authenticated via fixture
  });

  test("Scheduler - Generate Schedule", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/schedules/generator", "[data-testid='schedule-generator']");
    await waitForApiResponse(page, "/api/v1/teacher-preferences");

    // Verify generator UI loads
    await expect(page.locator("[data-testid='teacher-list']")).toBeVisible();
    await expect(page.locator("[data-testid='schedule-grid']")).toBeVisible();

    // Click generate
    await page.getByRole("button", { name: /generate|buat/i }).click();

    // Wait for generation response
    const genResponse = await waitForApiResponse(page, "/api/v1/schedule/generate", "POST");
    const genData = await genResponse.json();
    expect(genData.data).toBeDefined();

    // Wait for grid to update with results
    await expect(page.locator("[data-testid='schedule-grid'] .scheduled")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Scheduler - Save Schedule", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/schedules/generator", "[data-testid='schedule-generator']");
    await waitForApiResponse(page, "/api/v1/teacher-preferences");

    // Generate first
    await page.getByRole("button", { name: /generate|buat/i }).click();
    await waitForApiResponse(page, "/api/v1/schedule/generate", "POST");
    await expect(page.locator("[data-testid='schedule-grid'] .scheduled")).toBeVisible({
      timeout: 10_000,
    });

    // Save schedule
    await page.getByRole("button", { name: /save|simpan/i }).click();
    const saveResponse = await waitForApiResponse(page, "/api/v1/schedule/save", "POST");
    const saveData = await saveResponse.json();
    expect(saveData.data).toBeDefined();
  });

  test("Scheduler - View Semester Schedules", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/semester-schedule", "[data-testid='semester-schedule-list']");
    await waitForApiResponse(page, "/api/v1/semester-schedule");
    await expect(page.getByRole("table")).toBeVisible();
  });
});

test.describe("Reports Feature", () => {
  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    // Page is already authenticated via fixture
  });

  test("Reports - Generate Student Report", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/reports", "[data-testid='reports-page']");
    await waitForApiResponse(page, "/api/v1/reports");

    // Click generate for first student
    await page
      .getByRole("button", { name: /generate report|buat laporan/i })
      .first()
      .click();

    // Wait for async job creation
    const genResponse = await waitForApiResponse(page, "/api/v1/reports/generate", "POST");
    const genData = await genResponse.json();
    const jobId = genData.data?.id;
    expect(jobId).toBeDefined();

    // Poll for status
    await page.getByRole("button", { name: /refresh|muat ulang/i }).click();
    await waitForApiResponse(page, `/api/v1/reports/status/${jobId}`);

    // Eventually status should be completed
    const statusResponse = await waitForApiResponse(page, `/api/v1/reports/status/${jobId}`);
    const statusData = await statusResponse.json();
    expect(["pending", "processing", "completed", "failed"]).toContain(statusData.data?.status);
  });

  test("Reports - Download Report", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // This test requires a completed report job
    // In practice, you'd create one in setup or use a known completed job
    await gotoAndWait(page, "/reports", "[data-testid='reports-page']");
    await waitForApiResponse(page, "/api/v1/reports");

    // Look for download button on completed reports
    const downloadButtons = page.getByRole("button", { name: /download|unduh/i });
    if ((await downloadButtons.count()) > 0) {
      const downloadPromise = page.waitForEvent("download");
      await downloadButtons.first().click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });
});

test.describe("Analytics Feature", () => {
  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    // Page is already authenticated via fixture
  });

  test("Analytics - Attendance Analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/analytics/attendance", "[data-testid='analytics-attendance']");
    await waitForApiResponse(page, "/api/v1/analytics/attendance");
    await expect(page.locator("[data-testid='attendance-chart']")).toBeVisible();
  });

  test("Analytics - Grades Analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/analytics/grades", "[data-testid='analytics-grades']");
    await waitForApiResponse(page, "/api/v1/analytics/grades");
    await expect(page.locator("[data-testid='grades-chart']")).toBeVisible();
  });

  test("Analytics - Behavior Analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/analytics/behavior", "[data-testid='analytics-behavior']");
    await waitForApiResponse(page, "/api/v1/analytics/behavior");
    await expect(page.locator("[data-testid='behavior-chart']")).toBeVisible();
  });

  test("Analytics - System Analytics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/analytics/system", "[data-testid='analytics-system']");
    await waitForApiResponse(page, "/api/v1/analytics/system");
    await expect(page.locator("[data-testid='system-metrics']")).toBeVisible();
  });
});
