import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { accessControlProvider, declaredResources } from "../providers/accessControlProvider";

/**
 * Resources the API actually serves. Anything granted in the RBAC matrix must
 * appear here, otherwise the frontend renders a navigable page that can only
 * answer 404.
 *
 * Sourced from the route table in sma-adp-api/cmd/api-gateway/main.go.
 */
const API_RESOURCES = new Set([
  "analytics",
  "announcements",
  "archives",
  "attendance",
  "audit-logs",
  "behavior-notes",
  "calendar",
  "calendar-events",
  "class-subjects",
  "classes",
  "configuration",
  "dashboard",
  "documents",
  "enrollments",
  "exam-events",
  "grade-components",
  "grade-configs",
  "grades",
  "homerooms",
  "mutations",
  "reports",
  "schedules",
  "semester-schedule",
  "settings",
  "students",
  "subjects",
  "teacher-preferences",
  "teachers",
  "terms",
  "users",
]);

const ROLES = [
  "SUPERADMIN",
  "ADMIN_TU",
  "WALI_KELAS",
  "GURU_MAPEL",
  "KEPALA_SEKOLAH",
  "SISWA",
  "ORTU",
] as const;

const setRole = (role: string | null) => {
  if (role === null) {
    window.localStorage.removeItem("auth_role");
    return;
  }
  window.localStorage.setItem("auth_role", role);
};

const can = (resource: string, action: string) =>
  accessControlProvider.can!({ resource, action } as never);

describe("accessControlProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("grants everything to SUPERADMIN", async () => {
    setRole("SUPERADMIN");
    await expect(can("audit-logs", "list")).resolves.toMatchObject({ can: true });
    await expect(can("users", "delete")).resolves.toMatchObject({ can: true });
  });

  it("denies everything to an unknown or missing role", async () => {
    setRole(null);
    await expect(can("students", "list")).resolves.toMatchObject({ can: false });

    setRole("NOT_A_REAL_ROLE");
    await expect(can("students", "list")).resolves.toMatchObject({ can: false });
  });

  // /documents is an alias over the archive store; ADMIN_TU is the role that
  // manages school paperwork, so the permission must resolve.
  it("lets ADMIN_TU manage documents", async () => {
    setRole("ADMIN_TU");
    await expect(can("documents", "list")).resolves.toMatchObject({ can: true });
    await expect(can("documents", "create")).resolves.toMatchObject({ can: true });
    await expect(can("documents", "delete")).resolves.toMatchObject({ can: true });
  });

  // There is no /evaluations endpoint. Granting it produced a dead page.
  it("does not grant the phantom evaluations resource to any non-superadmin role", async () => {
    for (const role of ROLES.filter((r) => r !== "SUPERADMIN")) {
      setRole(role);
      await expect(can("evaluations", "list")).resolves.toMatchObject({ can: false });
    }
  });

  // The API mounts /schedules (plural). The singular key silently denied access.
  it("uses the plural schedules key for read-only roles", async () => {
    for (const role of ["SISWA", "ORTU"]) {
      setRole(role);
      await expect(can("schedules", "list")).resolves.toMatchObject({ can: true });
      await expect(can("schedules", "create")).resolves.toMatchObject({ can: false });
    }
  });

  // GET /dashboard returns school-wide aggregates and the API grants
  // KEPALA_SEKOLAH read access, so the principal keeps a dashboard entry.
  it("grants KEPALA_SEKOLAH read access to the dashboard", async () => {
    setRole("KEPALA_SEKOLAH");
    await expect(can("dashboard", "view")).resolves.toMatchObject({ can: true });
    await expect(can("dashboard", "list")).resolves.toMatchObject({ can: true });
    await expect(can("reports", "list")).resolves.toMatchObject({ can: true });
  });

  // Read access must not imply write access anywhere it is granted.
  it("does not let KEPALA_SEKOLAH mutate the dashboard or reports", async () => {
    setRole("KEPALA_SEKOLAH");
    await expect(can("dashboard", "edit")).resolves.toMatchObject({ can: false });
    await expect(can("dashboard", "delete")).resolves.toMatchObject({ can: false });
    await expect(can("reports", "delete")).resolves.toMatchObject({ can: false });
  });

  // Audit reads are SUPERADMIN-only server-side; ADMIN_TU must not be offered them.
  it("restricts audit-logs to SUPERADMIN", async () => {
    setRole("ADMIN_TU");
    await expect(can("audit-logs", "list")).resolves.toMatchObject({ can: false });

    setRole("SUPERADMIN");
    await expect(can("audit-logs", "list")).resolves.toMatchObject({ can: true });
  });

  it("keeps student and parent access read-only", async () => {
    for (const role of ["SISWA", "ORTU"]) {
      setRole(role);
      await expect(can("grades", "list")).resolves.toMatchObject({ can: true });
      await expect(can("grades", "edit")).resolves.toMatchObject({ can: false });
      await expect(can("grades", "delete")).resolves.toMatchObject({ can: false });
    }
  });

  // The guard that keeps the matrix honest: no permission may name a resource
  // the backend does not serve.
  it("only references resources the API serves", () => {
    const unknown = declaredResources().filter((resource) => !API_RESOURCES.has(resource));
    expect(unknown).toEqual([]);
  });

  // Unknown resources must default to deny for every non-superadmin role,
  // otherwise the check above would be meaningless.
  it("denies unknown resources for non-superadmin roles", async () => {
    for (const role of ROLES.filter((r) => r !== "SUPERADMIN")) {
      setRole(role);
      await expect(can("__definitely_not_a_resource__", "list")).resolves.toMatchObject({
        can: false,
      });
    }
  });
});
