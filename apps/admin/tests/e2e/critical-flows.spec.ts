import { test, expect } from "../fixtures/auth.js";
import { waitForApiResponse, gotoAndWait } from "../fixtures/auth.js";

test.describe("Critical User Flows", () => {
  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    // Page is already authenticated via fixture
  });

  test("Login → Dashboard → Student Roster → Grades", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // 1. Navigate to dashboard and wait for ready state
    await gotoAndWait(page, "/dashboard", "[data-testid='dashboard']");
    await expect(page.locator("[data-testid='dashboard']")).toHaveAttribute("data-ready", "true");

    // 2. Navigate to student roster
    await page.getByRole("link", { name: /students|siswa/i }).click();
    await waitForApiResponse(page, "/api/v1/students/roster");
    await expect(page.getByRole("table")).toBeVisible();

    // 3. Verify roster data loads
    await expect(page.getByRole("row").first()).toBeVisible();

    // 4. Navigate to grades
    await page.getByRole("link", { name: /grades|nilai/i }).click();
    await waitForApiResponse(page, "/api/v1/grades");
    await expect(page.getByRole("table")).toBeVisible();

    // 5. Verify grades data loads
    await expect(page.getByRole("row").first()).toBeVisible();
  });

  test("Login → Teacher Roster", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/teachers", "[data-testid='teachers-table']");
    await waitForApiResponse(page, "/api/v1/teachers/roster");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").first()).toBeVisible();
  });

  test("Login → Classes → Schedules", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/classes", "[data-testid='classes-table']");
    await waitForApiResponse(page, "/api/v1/classes");
    await expect(page.getByRole("table")).toBeVisible();

    // Navigate to schedules
    await page.getByRole("link", { name: /schedules|jadwal/i }).click();
    await waitForApiResponse(page, "/api/v1/schedules");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("Login → Reports → Student Report", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/reports", "[data-testid='reports-page']");
    await waitForApiResponse(page, "/api/v1/reports");

    // Click first student report
    await page
      .getByRole("link", { name: /student report|laporan siswa/i })
      .first()
      .click();
    await waitForApiResponse(page, "/api/v1/reports/students/");
    await expect(page.locator("[data-testid='student-report']")).toBeVisible();
  });
});
