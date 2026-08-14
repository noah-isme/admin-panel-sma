import { expect, test, devices, type Page, type Route } from "@playwright/test";

test.skip(process.env.PORTAL_STAGED === "1", "Visual fixture suite is not used for staging.");

/**
 * Visual regression tests for the parent/student portal.
 *
 * Run `npx playwright test portal-visual --update-snapshots` to generate baselines.
 * Baselines are committed to portal-visual.spec.ts-snapshots/.
 */

type Student = { id: string; fullName: string; className: string };

const students: Student[] = [
  { id: "student-1", fullName: "Alya Putri", className: "X IPA 1" },
  { id: "student-2", fullName: "Bima Putra", className: "XI IPS 2" },
];

function envelope(data: unknown) {
  return { data };
}

function response(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status >= 400 ? { error: { message: "Siswa tidak dapat diakses" } } : envelope(data)
    ),
  });
}

async function installApi(page: Page) {
  await page.route("**/api/v1/portal/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith("/auth/login") && request.method() === "POST") {
      return response(route, {
        accessToken: "access-parent",
        refreshToken: "refresh-parent",
        user: {
          id: "parent-1",
          email: "wali@example.test",
          fullName: "Wali Alya",
          role: "ORTU",
          portalRole: "ORTU",
          linkedStudents: students,
        },
      });
    }
    if (pathname.endsWith("/auth/logout")) return route.fulfill({ status: 204 });
    if (pathname.endsWith("/auth/refresh")) {
      return response(route, {
        accessToken: "access-parent-refreshed",
        refreshToken: "refresh-parent-refreshed",
        user: {
          id: "parent-1",
          email: "wali@example.test",
          fullName: "Wali Alya",
          role: "ORTU",
          portalRole: "ORTU",
          linkedStudents: students,
        },
      });
    }

    const studentId = url.searchParams.get("studentId") ?? "student-1";
    const student = students.find((item) => item.id === studentId) ?? students[0];

    if (pathname.endsWith("/grades")) {
      return response(route, {
        summary: {
          gpa: student.id === "student-2" ? 81.5 : 89.25,
          passedSubjects: 2,
          failedSubjects: 0,
        },
        grades: [
          {
            subjectId: "math",
            subjectName: "Matematika",
            teacherName: "Bu Rina",
            finalGrade: 89,
            letterGrade: "A",
            isPassed: true,
          },
        ],
      });
    }
    if (pathname.endsWith("/grades/report-card")) {
      return response(route, {
        studentId: student.id,
        studentName: student.fullName,
        nis: "240001",
        className: student.className,
        termId: "term-1",
        termName: "2026/2027 · Ganjil",
        grades: [
          {
            subjectId: "math",
            subjectName: "Matematika",
            subjectCode: "MAT",
            finalGrade: 89,
            letterGrade: "A",
            isPassed: true,
          },
        ],
        summary: { gpa: 89.25, passedSubjects: 1, failedSubjects: 0 },
      });
    }
    if (pathname.endsWith("/attendance")) {
      return response(route, {
        summary: { percentage: 98, present: 49, absent: 1 },
        daily: [{ id: "a1", date: "2026-08-01", status: "H", notes: "" }],
      });
    }
    if (pathname.endsWith("/announcements")) {
      return response(route, {
        data: [
          {
            id: "announcement-1",
            title: "Rapat orang tua",
            content: "Senin pukul 08.00",
            priority: "HIGH",
            isPinned: true,
            publisherName: "Sekolah",
            publishedAt: "2026-08-01",
          },
        ],
      });
    }
    if (pathname.endsWith("/behavior-notes")) {
      return response(route, {
        summary: { totalPoints: 8, positiveNotes: 2, negativeNotes: 0 },
        notes: [
          {
            id: "b1",
            title: "Aktif di kelas",
            category: "POSITIVE",
            date: "2026-08-02",
            reporterName: "Pak Agus",
            points: 8,
          },
        ],
      });
    }
    if (pathname.endsWith("/calendar")) {
      return response(route, {
        events: [
          {
            id: "event-1",
            title: "Ujian tengah semester",
            startDate: "2026-09-01",
            endDate: "2026-09-01",
            location: "Aula",
            description: "Ujian bersama",
            eventType: "EXAM",
          },
        ],
      });
    }
    if (pathname.endsWith("/homeroom")) {
      return response(route, {
        studentId: student.id,
        studentName: student.fullName,
        termId: "term-1",
        termName: "2026/2027 · Ganjil",
        classId: "class-1",
        className: student.className,
        homeroomTeacher: { id: "teacher-1", name: "Bu Rina" },
      });
    }
    return response(route, {});
  });
}

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("wali@example.test");
  await page.getByLabel("Kata sandi").fill("rahasia123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("heading", { name: "Nilai Akademik" })).toBeVisible();
}

// ── Login page (unauthenticated) ──

test("login page visual", async ({ page }) => {
  await installApi(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("portal-login.png", {
    fullPage: true,
    animations: "disabled",
  });
});

// ── Authenticated views ──

test.describe("Portal Views — Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await installApi(page);
    await login(page);
  });

  test("dashboard view", async ({ page }) => {
    await expect(page).toHaveScreenshot("portal-dashboard.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  const views = [
    { nav: "Nilai", screenshot: "portal-grades.png" },
    { nav: "Rapor", screenshot: "portal-report-card.png" },
    { nav: "Kehadiran", screenshot: "portal-attendance.png" },
    { nav: "Pengumuman", screenshot: "portal-announcements.png" },
    { nav: "Perilaku", screenshot: "portal-behavior.png" },
    { nav: "Kalender", screenshot: "portal-calendar.png" },
    { nav: "Wali Kelas", screenshot: "portal-homeroom.png" },
  ] as const;

  for (const { nav, screenshot } of views) {
    test(`${nav} view`, async ({ page }) => {
      await page.getByRole("menuitem", { name: nav }).click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(screenshot, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }

  test("child switcher — Bima Putra", async ({ page }) => {
    const selector = page.getByLabel("Pilih siswa").first();
    await selector.click();
    await page.getByText("Bima Putra · XI IPS 2").click();
    await expect(page.getByText("Menampilkan data Bima Putra")).toBeVisible();
    await expect(page).toHaveScreenshot("portal-child-switched.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

// ── Mobile viewport ──

test.describe("Portal Mobile — Visual Regression", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await installApi(page);
    await login(page);
  });

  test("mobile dashboard", async ({ page }) => {
    await expect(page).toHaveScreenshot("portal-mobile-dashboard.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("mobile login page", async ({ page }) => {
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("heading", { name: "Masuk ke Portal" })).toBeVisible();
    await expect(page).toHaveScreenshot("portal-mobile-login.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
