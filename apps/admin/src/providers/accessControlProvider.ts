import type { AccessControlProvider } from "@refinedev/core";

const STORAGE_ROLE_KEY = "auth_role";

const ROLE_KEYS = [
  "SUPERADMIN",
  "ADMIN_TU",
  "WALI_KELAS",
  "GURU_MAPEL",
  "KEPALA_SEKOLAH",
  "SISWA",
  "ORTU",
] as const;

type Role = (typeof ROLE_KEYS)[number];

type ResourceAction = "list" | "show" | "create" | "edit" | "delete" | "approve" | "view";

type ActionSet = "*" | readonly ResourceAction[];

type RolePermissions = Record<string, ActionSet>;

const READ_ACTIONS: readonly ResourceAction[] = ["list", "show"];
const RW_ACTIONS: readonly ResourceAction[] = ["list", "show", "create", "edit"];
const CRUD_ACTIONS: readonly ResourceAction[] = ["list", "show", "create", "edit", "delete"];
const EMPTY_ACTIONS: readonly ResourceAction[] = [];

// Every resource key below must correspond to an endpoint the API actually
// serves. Granting a permission for a resource with no backing route produces a
// navigable page that can only answer 404, which is worse than hiding it.
//
// `documents` maps to the archive store (`/documents`, an alias over
// `/archives`). There is deliberately no `evaluations` key: no such endpoint
// exists, and per-component marks are handled through `grades` plus
// `grade-components`.
const RBAC_MATRIX: Record<Role | "GUEST", RolePermissions> = {
  SUPERADMIN: {
    "*": "*",
    settings: "*",
    users: CRUD_ACTIONS,
    "audit-logs": READ_ACTIONS,
  },
  ADMIN_TU: {
    students: CRUD_ACTIONS,
    teachers: CRUD_ACTIONS,
    classes: CRUD_ACTIONS,
    subjects: CRUD_ACTIONS,
    terms: CRUD_ACTIONS,
    calendar: READ_ACTIONS,
    enrollments: CRUD_ACTIONS,
    "grade-components": CRUD_ACTIONS,
    "grade-configs": CRUD_ACTIONS,
    announcements: CRUD_ACTIONS,
    "behavior-notes": CRUD_ACTIONS,
    "calendar-events": CRUD_ACTIONS,
    "exam-events": READ_ACTIONS,
    attendance: READ_ACTIONS,
    grades: READ_ACTIONS,
    "class-subjects": CRUD_ACTIONS,
    schedules: CRUD_ACTIONS,
    "teacher-preferences": CRUD_ACTIONS,
    settings: CRUD_ACTIONS,
    documents: CRUD_ACTIONS,
    reports: RW_ACTIONS,
    mutations: CRUD_ACTIONS,
    archives: RW_ACTIONS,
    "audit-logs": EMPTY_ACTIONS,
  },
  WALI_KELAS: {
    attendance: RW_ACTIONS,
    grades: RW_ACTIONS,
    reports: RW_ACTIONS,
    mutations: READ_ACTIONS,
    archives: READ_ACTIONS,
    classes: READ_ACTIONS,
    calendar: READ_ACTIONS,
    "class-subjects": READ_ACTIONS,
    schedules: READ_ACTIONS,
    "teacher-preferences": READ_ACTIONS,
    settings: READ_ACTIONS,
    "grade-configs": READ_ACTIONS,
    announcements: READ_ACTIONS,
    "behavior-notes": CRUD_ACTIONS,
    "calendar-events": RW_ACTIONS,
    "exam-events": READ_ACTIONS,
  },
  GURU_MAPEL: {
    attendance: RW_ACTIONS,
    grades: RW_ACTIONS,
    subjects: READ_ACTIONS,
    "class-subjects": READ_ACTIONS,
    schedules: READ_ACTIONS,
    "teacher-preferences": READ_ACTIONS,
    settings: READ_ACTIONS,
    "grade-configs": READ_ACTIONS,
    announcements: READ_ACTIONS,
    "behavior-notes": CRUD_ACTIONS,
    calendar: READ_ACTIONS,
    "calendar-events": RW_ACTIONS,
    "exam-events": READ_ACTIONS,
    mutations: READ_ACTIONS,
    archives: READ_ACTIONS,
    reports: RW_ACTIONS,
  },
  KEPALA_SEKOLAH: {
    // GET /dashboard returns school-wide aggregates, which is the principal's
    // primary view; the API grants KEPALA_SEKOLAH read access to it.
    dashboard: ["list", "show", "view"],
    reports: READ_ACTIONS,
    mutations: READ_ACTIONS,
    archives: READ_ACTIONS,
    attendance: READ_ACTIONS,
    grades: READ_ACTIONS,
    students: READ_ACTIONS,
    announcements: ["approve"],
    "class-subjects": READ_ACTIONS,
    schedules: READ_ACTIONS,
    "teacher-preferences": READ_ACTIONS,
    settings: READ_ACTIONS,
    "grade-configs": READ_ACTIONS,
    "behavior-notes": READ_ACTIONS,
    calendar: READ_ACTIONS,
    "calendar-events": CRUD_ACTIONS,
    "exam-events": READ_ACTIONS,
  },
  SISWA: {
    attendance: READ_ACTIONS,
    grades: READ_ACTIONS,
    classes: READ_ACTIONS,
    announcements: READ_ACTIONS,
    schedules: READ_ACTIONS,
    calendar: READ_ACTIONS,
    "teacher-preferences": READ_ACTIONS,
    settings: READ_ACTIONS,
    "calendar-events": READ_ACTIONS,
    "exam-events": READ_ACTIONS,
  },
  ORTU: {
    attendance: READ_ACTIONS,
    grades: READ_ACTIONS,
    classes: READ_ACTIONS,
    announcements: READ_ACTIONS,
    schedules: READ_ACTIONS,
    "behavior-notes": READ_ACTIONS,
    calendar: READ_ACTIONS,
    "teacher-preferences": READ_ACTIONS,
    settings: READ_ACTIONS,
    "calendar-events": READ_ACTIONS,
    "exam-events": READ_ACTIONS,
  },
  GUEST: {},
};

/**
 * Every resource name the matrix grants a permission for, excluding the `*`
 * wildcard. Exported so a test can assert the matrix never names a resource the
 * API does not serve.
 */
export const declaredResources = (): string[] => {
  const names = new Set<string>();
  Object.values(RBAC_MATRIX).forEach((permissions) => {
    Object.keys(permissions).forEach((resource) => {
      if (resource !== "*") {
        names.add(resource);
      }
    });
  });
  return [...names].sort();
};

const normalizeRole = (rawRole: unknown): Role | "GUEST" => {
  if (!rawRole || typeof rawRole !== "string") {
    return "GUEST";
  }

  const trimmed = rawRole.trim().toUpperCase();
  const matched = ROLE_KEYS.find((role) => role === trimmed);
  if (matched) {
    return matched;
  }

  // Common aliases we can map automatically
  if (["SUPER_ADMIN", "SYSADMIN"].includes(trimmed)) {
    return "SUPERADMIN";
  }
  if (["ADMIN", "ADMINISTRATOR", "ADMIN_TATA_USAHA", "ADMINISTRASI"].includes(trimmed)) {
    return "ADMIN_TU";
  }
  if (["HOMEROOM", "WALIKELAS"].includes(trimmed)) {
    return "WALI_KELAS";
  }
  if (["GURU", "TEACHER"].includes(trimmed)) {
    return "GURU_MAPEL";
  }
  if (["KEPSEK", "PRINCIPAL"].includes(trimmed)) {
    return "KEPALA_SEKOLAH";
  }
  if (["STUDENT"].includes(trimmed)) {
    return "SISWA";
  }
  if (["PARENT", "GUARDIAN", "WALI_MURID"].includes(trimmed)) {
    return "ORTU";
  }

  return "GUEST";
};

const getStoredRole = (): Role | "GUEST" => {
  if (typeof window === "undefined") {
    return "GUEST";
  }

  try {
    const role = window.localStorage.getItem(STORAGE_ROLE_KEY);
    if (!role) {
      return "GUEST";
    }
    return normalizeRole(role);
  } catch (error) {
    console.warn("[accessControl] Failed to read stored role from localStorage", error);
    return "GUEST";
  }
};

const resolveActions = (role: Role | "GUEST", resource?: string): ActionSet => {
  const permissions = RBAC_MATRIX[role] ?? RBAC_MATRIX.GUEST;
  if (!resource) {
    return permissions["*"] ?? RBAC_MATRIX.GUEST["*"] ?? EMPTY_ACTIONS;
  }

  return permissions[resource] ?? permissions["*"] ?? RBAC_MATRIX.GUEST[resource] ?? EMPTY_ACTIONS;
};

const isActionAllowed = (actionSet: ActionSet, action: ResourceAction): boolean => {
  if (actionSet === "*") {
    return true;
  }

  return actionSet.includes(action);
};

const DEFAULT_REASON =
  "Anda tidak memiliki akses untuk melakukan aksi ini. Silakan hubungi administrator.";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = getStoredRole();

    if (role === "SUPERADMIN") {
      return { can: true };
    }

    const normalizedAction = (action ?? "list") as ResourceAction;
    const allowedActions = resolveActions(role, resource);
    const canAccess = isActionAllowed(allowedActions, normalizedAction);

    if (!canAccess) {
      return {
        can: false,
        reason: DEFAULT_REASON,
      };
    }

    return { can: true };
  },
};
