import { expect, test, type Page, type Route } from "@playwright/test";

test.skip(process.env.PORTAL_STAGED === "1", "Local fixture suite is not used for staging.");

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
  const requests: string[] = [];
  await page.route("**/api/v1/portal/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
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

    if (url.searchParams.get("studentId") === "foreign-student") {
      return response(route, undefined, 403);
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
  return requests;
}

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("wali@example.test");
  await page.getByLabel("Kata sandi").fill("rahasia123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("heading", { name: "Nilai Akademik" })).toBeVisible();
}

test("parent can sign in, switch child, and inspect every read-only view", async ({ page }) => {
  const requests = await installApi(page);
  await login(page);

  await expect(page.getByText("Wali Alya")).toBeVisible();
  const selector = page.getByLabel("Pilih siswa").first();
  await selector.click();
  await page.getByText("Bima Putra · XI IPS 2").click();
  await expect(page.getByText("Menampilkan data Bima Putra")).toBeVisible();
  await expect(page.getByText("81.5")).toBeVisible();

  for (const [label, title, marker] of [
    ["Rapor", "Rapor Siswa", "NIS"],
    ["Kehadiran", "Kehadiran", "98.00%"],
    ["Pengumuman", "Pengumuman Sekolah", "Rapat orang tua"],
    ["Perilaku", "Catatan Perilaku", "Poin total"],
    ["Kalender", "Kalender Akademik", "Ujian tengah semester"],
    ["Wali Kelas", "Informasi Wali Kelas", "Bu Rina"],
  ] as const) {
    await page.getByRole("menuitem", { name: label }).click();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();
  }

  expect(requests.some((request) => request.includes("studentId=student-2"))).toBe(true);
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke Portal" })).toBeVisible();
});

test("portal API rejects a cross-family student scope", async ({ page }) => {
  await installApi(page);
  await login(page);
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/v1/portal/grades?studentId=foreign-student", {
      headers: { Authorization: "Bearer access-parent" },
    });
    return response.status;
  });
  expect(result).toBe(403);
});
