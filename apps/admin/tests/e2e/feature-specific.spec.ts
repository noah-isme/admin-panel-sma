import { test, expect } from "../fixtures/auth.js";
import { gotoAndWait } from "../fixtures/auth.js";

test.describe("Scheduler Feature", () => {
  test("Scheduler generator page loads", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/schedules/generator");
    await expect(page.getByRole("heading", { name: /generator jadwal otomatis/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /generate otomatis/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /simpan jadwal/i })).toBeVisible();
  });

  test("Schedules list loads", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/schedules");
    await expect(page.getByRole("heading", { name: /jadwal pelajaran/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });
});

test.describe("Reports Feature", () => {
  test("Reports page exposes the async report form", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/reports");
    await expect(page.getByRole("heading", { name: /laporan async/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /buat laporan/i }).first()).toBeVisible();
    await expect(page.getByText(/belum ada laporan/i)).toBeVisible();
  });
});

test.describe("Analytics Feature", () => {
  test("Attendance analytics page loads", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/attendance");
    await expect(page.getByRole("heading", { name: "Rekap Kehadiran", exact: true })).toBeVisible();
  });

  test("Grades analytics page loads", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/grades/analytics");
    await expect(page.getByRole("heading", { name: /analitik nilai/i })).toBeVisible();
  });

  test("Behavior analytics page loads", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/behavior-notes/analytics");
    await expect(page.getByRole("heading", { name: /analitik perilaku/i })).toBeVisible();
  });

  test("Dashboard exposes system metrics", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await gotoAndWait(page, "/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard akademik/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /tingkat kehadiran/i })).toBeVisible();
  });
});
