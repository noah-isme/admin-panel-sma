import { test, expect } from "../fixtures/auth.js";
import { waitForApiResponse, gotoAndWait } from "../fixtures/auth.js";

test.describe("Critical User Flows", () => {
  test("Login → Dashboard → Student Roster → Grades", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // 1. Navigate to dashboard and wait for ready state
    await gotoAndWait(page, "/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard akademik/i })).toBeVisible();

    // 2. Navigate to student roster
    const studentsResponse = waitForApiResponse(page, "/api/v1/students");
    await page.getByRole("button", { name: /^Siswa\b/i }).click();
    await studentsResponse;
    await expect(page.getByRole("table")).toBeVisible();

    // 3. Verify roster data loads
    await expect(page.getByRole("row").first()).toBeVisible();

    // 4. Navigate to grades
    const gradesResponse = waitForApiResponse(page, "/api/v1/grades/report");
    await page.goto("/admin/grades", { waitUntil: "domcontentloaded" });
    await gradesResponse;
    await expect(page.getByRole("heading", { name: /laporan nilai akademik/i })).toBeVisible();

    // 5. Verify grades data loads
    await expect(page.getByText(/rata-rata kelas/i)).toBeVisible();
  });

  test("Login → Teacher Roster", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const teachersResponse = waitForApiResponse(page, "/api/v1/teachers");
    await gotoAndWait(page, "/teachers");
    await teachersResponse;
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").first()).toBeVisible();
  });

  test("Login → Classes → Schedules", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const classesResponse = waitForApiResponse(page, "/api/v1/classes");
    await gotoAndWait(page, "/classes");
    await classesResponse;
    await expect(page.getByRole("table")).toBeVisible();

    // Navigate to schedules
    const schedulesResponse = waitForApiResponse(page, "/api/v1/schedules");
    await page.goto("/admin/schedules", { waitUntil: "domcontentloaded" });
    await schedulesResponse;
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("Login → Reports → Student Report", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/reports");
    await expect(page.getByRole("heading", { name: /laporan async/i })).toBeVisible();

    // Click first student report
    // The current report page exposes async report generation rather than a
    // separate student-report route. Verify that the form is available.
    await expect(page.getByRole("button", { name: /buat laporan/i }).first()).toBeVisible();
  });
});
