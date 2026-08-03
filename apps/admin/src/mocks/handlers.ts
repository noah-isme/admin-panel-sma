import { http, HttpResponse } from "msw";
import {
  createSeedData,
  type SemesterScheduleSlotRecord,
  type TeacherPreferenceRecord,
} from "./seed";
import type {
  GradeReportResponse,
  GradeReportRow,
  GradeStatusCode,
  GradeStatusMeta,
} from "../types/grade-report";
import type {
  StudentRosterResponse,
  StudentRosterRow,
  StudentStatusCode,
  StudentGenderCode,
  StudentRosterSortField,
} from "../types/student-roster";
import type {
  TeacherRosterAppliedFilters,
  TeacherRosterResponse,
  TeacherRosterRow,
  TeacherRosterSortField,
  TeacherStatusCode,
  TeacherAvailabilityLevel,
} from "../types/teacher-roster";

/**
 * Skenario MSW: SMA Negeri Harapan Nusantara (TP 2024/2025)
 *
 * Dataset dihasilkan melalui generator seed agar merepresentasikan kondisi realistis:
 * - 2 term akademik
 * - 15 mata pelajaran
 * - 10 kelas aktif (X-XII, IPA & IPS)
 * - ±300 siswa dengan status dan wali
 * - Jadwal, nilai, absensi, mutasi, arsip, dan dashboard kepala sekolah
 */

const seed = createSeedData();

const terms = [...seed.terms];
const subjects = [...seed.subjects];
const teachers = [...seed.teachers];
const classes = [...seed.classes];
const students = [...seed.students];
const enrollments = [...seed.enrollments];
const classSubjects = [...seed.classSubjects];
const schedules = [...seed.schedules];
const teacherPreferences = [...seed.teacherPreferences];
const semesterSchedule = [...seed.semesterSchedule];
const gradeComponents = [...seed.gradeComponents];
const gradeConfigs = [...seed.gradeConfigs];
const grades = [...seed.grades];
const attendance = [...seed.attendance];
const calendarEvents = [...seed.calendarEvents];
const examEvents = [...seed.examEvents];
const announcements = [...seed.announcements];
const behaviorNotes = [...seed.behaviorNotes];
const mutations = [...seed.mutations];
const archives = [...seed.archives];
const reportJobs: Record<string, any>[] = [];
const principalDashboard = { ...seed.dashboard };

const termById = new Map(terms.map((term) => [term.id, term]));
const classById = new Map(classes.map((klass) => [klass.id, klass]));
const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
const studentById = new Map(students.map((student) => [student.id, student]));
const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
const gradeComponentById = new Map(gradeComponents.map((component) => [component.id, component]));
const classSubjectById = new Map(
  classSubjects.map((classSubject) => [classSubject.id, classSubject])
);
const gradeConfigByClassSubject = new Map(
  gradeConfigs.map((config) => [config.classSubjectId, config])
);
const classSubjectsByTeacher = new Map<string, (typeof classSubjects)[number][]>();
classSubjects.forEach((mapping) => {
  const list = classSubjectsByTeacher.get(mapping.teacherId) ?? [];
  list.push(mapping);
  classSubjectsByTeacher.set(mapping.teacherId, list);
});
const homeroomClassByTeacher = new Map<string, (typeof classes)[number]>();
classes.forEach((klass) => {
  if (klass.homeroomId) {
    homeroomClassByTeacher.set(klass.homeroomId, klass);
  }
});
const teacherPreferenceByTeacher = new Map(
  teacherPreferences.map((pref) => [pref.teacherId, pref])
);

type MockUserRecord = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role:
    | "SUPERADMIN"
    | "ADMIN_TU"
    | "KEPALA_SEKOLAH"
    | "WALI_KELAS"
    | "GURU_MAPEL"
    | "SISWA"
    | "ORTU";
  teacherId?: string | null;
  studentId?: string | null;
  classId?: string | null;
};

const DEFAULT_PASSWORD = "Admin123!";

const toLocalPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

const homeroomClass = classes.find((klass) => klass.id === "class_x_ipa_1") ?? classes[0];
const homeroomTeacher =
  teachers.find((teacher) => teacher.id === homeroomClass?.homeroomId) ?? teachers[0];
const mathSubject = subjects.find((subject) => subject.code === "MAT") ?? subjects[0];
const mathTeacher =
  teachers.find((teacher) => teacher.mainSubjectId === mathSubject.id) ?? teachers[1];
const principalTeacher =
  teachers.find((teacher) => teacher.fullName.toLowerCase().includes("surya")) ?? teachers[2];
const sampleStudent =
  students.find((student) => student.id === "stu_aditya_wijaya") ??
  students.find((student) => student.status === "active") ??
  students[0];
const sampleClass = classes.find((klass) => klass.id === sampleStudent.classId) ?? classes[0];
const guardianName = sampleStudent.guardian ?? "Orang Tua";
const guardianEmailLocal = `${toLocalPart(guardianName)}.${toLocalPart(sampleStudent.fullName.split(" ").slice(-1)[0] ?? "wali")}`;

const mockUsers: MockUserRecord[] = [
  {
    id: "user_superadmin",
    email: "superadmin@harapannusantara.sch.id",
    password: DEFAULT_PASSWORD,
    fullName: "Super Admin",
    role: "SUPERADMIN",
  },
  {
    id: "user_admin_tu",
    email: "admin.tu@harapannusantara.sch.id",
    password: DEFAULT_PASSWORD,
    fullName: "Admin Tata Usaha",
    role: "ADMIN_TU",
  },
  {
    id: "user_kepsek",
    email: "kepsek@harapannusantara.sch.id",
    password: DEFAULT_PASSWORD,
    fullName: principalTeacher.fullName.replace(/^Pak |^Ibu /, "Drs. "),
    role: "KEPALA_SEKOLAH",
    teacherId: principalTeacher.id,
  },
  {
    id: "user_wali_kelas",
    email: `wali.${toLocalPart(homeroomClass.code)}@harapannusantara.sch.id`,
    password: DEFAULT_PASSWORD,
    fullName: homeroomTeacher.fullName.replace(/^Pak |^Ibu /, ""),
    role: "WALI_KELAS",
    teacherId: homeroomTeacher.id,
    classId: homeroomClass.id,
  },
  {
    id: "user_guru_mapel",
    email: `guru.${toLocalPart(mathSubject.code)}@harapannusantara.sch.id`,
    password: DEFAULT_PASSWORD,
    fullName: mathTeacher.fullName.replace(/^Pak |^Ibu /, ""),
    role: "GURU_MAPEL",
    teacherId: mathTeacher.id,
  },
  {
    id: "user_siswa",
    email: `${toLocalPart(sampleStudent.fullName)}@harapannusantara.sch.id`,
    password: DEFAULT_PASSWORD,
    fullName: sampleStudent.fullName,
    role: "SISWA",
    studentId: sampleStudent.id,
    classId: sampleClass.id,
  },
  {
    id: "user_ortu",
    email: `${guardianEmailLocal}@harapannusantara.sch.id`,
    password: DEFAULT_PASSWORD,
    fullName: guardianName,
    role: "ORTU",
    studentId: sampleStudent.id,
    classId: sampleClass.id,
  },
];

const sanitizeUser = (user: MockUserRecord) => {
  const { password: _password, ...rest } = user;
  return rest;
};

let currentUser = sanitizeUser(mockUsers[0]);

const findUserByEmail = (email: string | null | undefined) => {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return mockUsers.find((user) => user.email.toLowerCase() === normalized);
};

const findUserByRole = (role: string | null | undefined) => {
  if (!role) return undefined;
  const normalized = role.trim().toUpperCase();
  return mockUsers.find((user) => user.role === normalized);
};

const _resourceKeys = [
  "users",
  "students",
  "teachers",
  "classes",
  "subjects",
  "terms",
  "enrollments",
  "grade-components",
  "grade-configs",
  "grades",
  "attendance",
  "teacher-preferences",
  "semester-schedule",
  "calendar-events",
  "exam-events",
  "class-subjects",
  "schedules",
  "announcements",
  "behavior-notes",
  "mutations",
  "archives",
  "dashboard",
] as const;

export type ResourceKey = (typeof _resourceKeys)[number];

const stores: Record<ResourceKey, Record<string, any>[]> = {
  users: mockUsers.map((user) => sanitizeUser(user)),
  students,
  teachers,
  classes,
  subjects,
  terms,
  enrollments,
  "grade-components": gradeComponents,
  "grade-configs": gradeConfigs,
  grades,
  attendance,
  "teacher-preferences": teacherPreferences,
  "semester-schedule": semesterSchedule,
  "calendar-events": calendarEvents,
  "exam-events": examEvents,
  "class-subjects": classSubjects,
  schedules,
  announcements,
  "behavior-notes": behaviorNotes,
  mutations,
  archives,
  dashboard: [principalDashboard],
};

const USER_ROLE_SET = new Set<MockUserRecord["role"]>([
  "SUPERADMIN",
  "ADMIN_TU",
  "KEPALA_SEKOLAH",
  "WALI_KELAS",
  "GURU_MAPEL",
  "SISWA",
  "ORTU",
]);

const normalizeNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  const stringified = String(value).trim();
  return stringified.length === 0 ? null : stringified;
};

const normalizeUserRole = (value: unknown): MockUserRecord["role"] => {
  if (typeof value !== "string") {
    return "ADMIN_TU";
  }
  const upper = value.trim().toUpperCase();
  if (USER_ROLE_SET.has(upper as MockUserRecord["role"])) {
    return upper as MockUserRecord["role"];
  }

  switch (upper) {
    case "SUPER_ADMIN":
    case "SUPER-ADMIN":
      return "SUPERADMIN";
    case "ADMIN":
    case "ADMINISTRATOR":
    case "ADMINISTRASI":
      return "ADMIN_TU";
    case "KEPSEK":
    case "PRINCIPAL":
      return "KEPALA_SEKOLAH";
    case "WALI":
    case "HOMEROOM":
    case "WALIKELAS":
      return "WALI_KELAS";
    case "GURU":
    case "TEACHER":
      return "GURU_MAPEL";
    case "STUDENT":
      return "SISWA";
    case "PARENT":
    case "GUARDIAN":
    case "WALI_MURID":
      return "ORTU";
    default:
      return "ADMIN_TU";
  }
};

const resourcePathRegex =
  /\/(?:api(?:\/v1)?)?\/?(users|students|teachers|classes|subjects|terms|enrollments|grade-components|grade-configs|grades|attendance|teacher-preferences|semester-schedule|calendar-events|exam-events|class-subjects|schedules|announcements|behavior-notes|mutations|archives|dashboard)(?:\/([^/?]+))?\/?$/;

const parseResourceRequest = (request: Request) => {
  const url = new URL(request.url);
  const match = url.pathname.match(resourcePathRegex);
  if (!match) {
    return null;
  }
  const resource = match[1] as ResourceKey;
  const id = match[2] ?? null;
  return { resource, id, url };
};

const clone = <T>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

const generateId = (prefix: string) => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
};

const sanitizeDate = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : undefined;
  }
  return date.toISOString().slice(0, 10);
};

const sanitizeDateTime = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : undefined;
  }
  return date.toISOString();
};

const normalizers: Partial<
  Record<ResourceKey, (data: Record<string, any>) => Record<string, any>>
> = {
  users: (data) => {
    const next = { ...data };
    next.id = String(next.id ?? "");
    next.email = typeof next.email === "string" ? next.email.trim().toLowerCase() : "";
    next.fullName =
      typeof next.fullName === "string" && next.fullName.trim().length > 0
        ? next.fullName.trim()
        : typeof next.name === "string" && next.name.trim().length > 0
          ? next.name.trim()
          : next.email;
    next.role = normalizeUserRole(next.role);
    next.teacherId = normalizeNullableString(next.teacherId);
    next.studentId = normalizeNullableString(next.studentId);
    next.classId = normalizeNullableString(next.classId);
    delete next.password;
    return next;
  },
  students: (data) => {
    const next = { ...data };
    const birthDate = sanitizeDate(next.birthDate);
    if (birthDate) next.birthDate = birthDate;
    return next;
  },
  classes: (data) => {
    const next = { ...data };
    if (typeof next.level === "string") {
      const parsed = Number(next.level);
      next.level = Number.isNaN(parsed) ? next.level : parsed;
    }
    return next;
  },
  subjects: (data) => ({ ...data }),
  teachers: (data) => ({ ...data }),
  terms: (data) => {
    const next = { ...data };
    const startDate = sanitizeDate(next.startDate);
    const endDate = sanitizeDate(next.endDate);
    if (startDate) next.startDate = startDate;
    if (endDate) next.endDate = endDate;
    // The API field is `is_active` (normalized to `isActive`); `active` is the
    // older fixture alias. Keep both in step so a write through either name
    // stays visible to readers of the other.
    if (typeof next.isActive !== "undefined") {
      next.isActive = Boolean(next.isActive);
      next.active = next.isActive;
    } else if (typeof next.active !== "undefined") {
      next.active = Boolean(next.active);
      next.isActive = next.active;
    }
    return next;
  },
  "grade-components": (data) => {
    const next = { ...data };
    if (typeof next.weight === "string") {
      const parsed = Number(next.weight);
      next.weight = Number.isNaN(parsed) ? next.weight : parsed;
    }
    if (typeof next.kkm === "string") {
      const parsed = Number(next.kkm);
      next.kkm = Number.isNaN(parsed) ? next.kkm : parsed;
    }
    if (!next.classSubjectId && next.subjectId) {
      const mapping = classSubjects.find((item) => item.subjectId === next.subjectId);
      if (mapping) {
        next.classSubjectId = mapping.id;
      }
    }
    if (next.classSubjectId) {
      const mapping = classSubjects.find((item) => item.id === next.classSubjectId);
      if (mapping) {
        next.subjectId = mapping.subjectId;
        next.termId = mapping.termId;
      }
    }
    return next;
  },
  grades: (data) => {
    const next = { ...data };
    if (typeof next.score === "string") {
      const parsed = Number(next.score);
      next.score = Number.isNaN(parsed) ? next.score : parsed;
    }
    return next;
  },
  attendance: (data) => {
    const next = { ...data };
    const date = sanitizeDate(next.date);
    if (date) next.date = date;
    if (typeof next.slot === "string") {
      const parsed = Number(next.slot);
      next.slot = Number.isNaN(parsed) ? next.slot : parsed;
    }
    const recordedAt = sanitizeDateTime(next.recordedAt);
    if (recordedAt) next.recordedAt = recordedAt;
    const updatedAt = sanitizeDateTime(next.updatedAt);
    if (updatedAt) next.updatedAt = updatedAt;
    return next;
  },
  "calendar-events": (data) => {
    const next = { ...data };
    const startDate = sanitizeDateTime(next.startDate);
    const endDate = sanitizeDateTime(next.endDate);
    if (startDate) next.startDate = startDate;
    if (endDate) next.endDate = endDate;
    if (typeof next.allDay !== "undefined") {
      next.allDay = Boolean(next.allDay);
    }
    return next;
  },
  "exam-events": (data) => {
    const next = { ...data };
    const startDate = sanitizeDateTime(next.startDate);
    const endDate = sanitizeDateTime(next.endDate);
    if (startDate) next.startDate = startDate;
    if (endDate) next.endDate = endDate;
    return next;
  },
  "teacher-preferences": (data) => ({ ...data }),
  "semester-schedule": (data) => {
    const next = { ...data };
    if (typeof next.dayOfWeek === "string") {
      const parsed = Number(next.dayOfWeek);
      next.dayOfWeek = Number.isNaN(parsed) ? next.dayOfWeek : parsed;
    }
    if (typeof next.slot === "string") {
      const parsed = Number(next.slot);
      next.slot = Number.isNaN(parsed) ? next.slot : parsed;
    }
    return next;
  },
  "grade-configs": (data) => {
    const next = { ...data };
    if (typeof next.kkm === "string") {
      const parsed = Number(next.kkm);
      next.kkm = Number.isNaN(parsed) ? next.kkm : parsed;
    }
    if (!next.status) {
      next.status = "draft";
    }
    return next;
  },
  "class-subjects": (data) => {
    const next = { ...data };
    if (typeof next.termId !== "string" || !next.termId) {
      next.termId = terms.find((term) => term.active)?.id ?? terms[0]?.id;
    }
    return next;
  },
  schedules: (data) => {
    const next = { ...data };
    if (typeof next.dayOfWeek === "string") {
      const parsed = Number(next.dayOfWeek);
      next.dayOfWeek = Number.isNaN(parsed) ? next.dayOfWeek : parsed;
    }
    if (Array.isArray(next.dayOfWeek)) {
      next.dayOfWeek = Number(next.dayOfWeek[0]);
    }
    if (typeof next.startTime === "string") {
      next.startTime = next.startTime.slice(0, 5);
    }
    if (typeof next.endTime === "string") {
      next.endTime = next.endTime.slice(0, 5);
    }
    return next;
  },
  announcements: (data) => ({ ...data }),
  "behavior-notes": (data) => {
    const next = { ...data };
    const date = sanitizeDate(next.date);
    if (date) next.date = date;
    return next;
  },
  mutations: (data) => {
    const next = { ...data };
    const effectiveDate = sanitizeDate(next.effectiveDate);
    if (effectiveDate) next.effectiveDate = effectiveDate;
    if (Array.isArray(next.auditTrail)) {
      next.auditTrail = next.auditTrail.map((entry: Record<string, any>) => ({
        ...entry,
        timestamp: entry.timestamp ?? new Date().toISOString(),
      }));
    }
    return next;
  },
  archives: (data) => {
    const next = { ...data };
    if (typeof next.fileSize === "string") {
      const parsed = Number(next.fileSize);
      next.fileSize = Number.isNaN(parsed) ? next.fileSize : parsed;
    }
    return next;
  },
  dashboard: (data) => ({ ...data }),
};

const sanitizePayload = (resource: ResourceKey, payload: Record<string, any>) => {
  const normalizer = normalizers[resource];
  return normalizer ? normalizer(payload) : { ...payload };
};

const collectIds = (url: URL) => {
  const ids: string[] = [];
  url.searchParams.forEach((value, key) => {
    if (key === "ids" || key === "ids[]" || key.startsWith("ids[")) {
      ids.push(value);
    }
  });
  return ids;
};

const getValue = (record: Record<string, any>, path: string) => {
  return path
    .split(".")
    .reduce<any>((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), record);
};

const normalizeFilterKey = (key: string) => {
  if (key.endsWith("[]")) {
    return key.slice(0, -2);
  }

  const indexedMatch = key.match(/^(.*)\[\d+\]$/);
  if (indexedMatch) {
    return indexedMatch[1];
  }

  return key;
};

const appendFilterValue = (filters: Record<string, unknown>, rawKey: string, value: unknown) => {
  const key = normalizeFilterKey(rawKey);
  const existing = filters[key];

  if (existing === undefined) {
    filters[key] = value;
    return;
  }

  if (Array.isArray(existing)) {
    if (!existing.includes(value)) {
      filters[key] = [...existing, value];
    }
    return;
  }

  if (existing === value) {
    return;
  }

  filters[key] = [existing, value];
};

const parseFilters = (url: URL) => {
  const ignored = new Set([
    "filter",
    "_page",
    "_perPage",
    "page",
    "perPage",
    "_start",
    "_end",
    "_sort",
    "_order",
    "sort",
    "order",
    "ids",
    "ids[]",
    "limit",
    "cursor",
    "skip",
    "take",
    "offset",
    "current",
    "pageSize",
  ]);

  const filters: Record<string, unknown> = {};
  const filterParam = url.searchParams.get("filter");
  if (filterParam) {
    try {
      const parsed = JSON.parse(filterParam);
      if (parsed && typeof parsed === "object") {
        Object.assign(filters, parsed as Record<string, unknown>);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  url.searchParams.forEach((value, key) => {
    if (ignored.has(key) || key.startsWith("ids[")) return;
    if (value === null || value === "") return;
    appendFilterValue(filters, key, value);
  });

  return filters;
};

const applyFilters = (records: Record<string, any>[], filters: Record<string, unknown>) => {
  const entries = Object.entries(filters ?? {}).filter(
    ([, expected]) => expected !== undefined && expected !== null && expected !== ""
  );
  if (entries.length === 0) {
    return records;
  }

  return records.filter((record) =>
    entries.every(([rawKey, expected]) => {
      const isFuzzy = rawKey.endsWith("~");
      const key = isFuzzy ? rawKey.slice(0, -1) : rawKey;
      const actual = getValue(record, key);

      if (expected === undefined || expected === null) return true;
      if (Array.isArray(expected)) {
        return expected.includes(actual);
      }

      if (typeof expected === "string") {
        const normalizedExpected = expected.trim().toLowerCase();
        if (normalizedExpected === "") return true;
        const normalizedActual = String(actual ?? "")
          .trim()
          .toLowerCase();
        return isFuzzy || normalizedExpected.length > 2
          ? normalizedActual.includes(normalizedExpected)
          : normalizedActual === normalizedExpected;
      }

      return String(actual ?? "") === String(expected);
    })
  );
};

const applySort = (records: Record<string, any>[], sortField: string | null, sortOrder: string) => {
  if (!sortField) return records;
  const direction = sortOrder === "DESC" ? -1 : 1;

  return [...records].sort((a, b) => {
    const valueA = getValue(a, sortField);
    const valueB = getValue(b, sortField);
    if (valueA === valueB) return 0;
    if (valueA === undefined || valueA === null) return 1;
    if (valueB === undefined || valueB === null) return -1;

    if (typeof valueA === "number" && typeof valueB === "number") {
      return valueA < valueB ? -1 * direction : direction;
    }

    const stringA = String(valueA).toLowerCase();
    const stringB = String(valueB).toLowerCase();
    if (stringA === stringB) return 0;
    return stringA < stringB ? -1 * direction : direction;
  });
};

const applyPagination = (records: Record<string, any>[], url: URL) => {
  const total = records.length;
  const startParam = url.searchParams.get("_start");
  const endParam = url.searchParams.get("_end");

  if (startParam !== null && endParam !== null) {
    const start = Number(startParam);
    const end = Number(endParam);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      return { data: records.slice(start, end), total };
    }
  }

  const pageParam = url.searchParams.get("_page") ?? url.searchParams.get("page");
  const perPageParam = url.searchParams.get("_perPage") ?? url.searchParams.get("perPage");
  const page = Number(pageParam ?? 1);
  const perPage = Number(perPageParam ?? total);

  if (Number.isNaN(page) || Number.isNaN(perPage) || perPage <= 0) {
    return { data: records, total };
  }

  const startIndex = Math.max(0, (page - 1) * perPage);
  const endIndex = startIndex + perPage;
  return { data: records.slice(startIndex, endIndex), total };
};

const buildListResponse = (resource: ResourceKey, url: URL) => {
  const ids = collectIds(url);
  let items = stores[resource];
  if (ids.length > 0) {
    const idSet = new Set(ids.map(String));
    items = items.filter((item) => idSet.has(String(item.id)));
  }

  const filters = parseFilters(url);
  const sortField = url.searchParams.get("_sort") ?? url.searchParams.get("sort");
  const sortOrder = (url.searchParams.get("_order") ?? url.searchParams.get("order") ?? "ASC")
    .toString()
    .toUpperCase();

  let result = clone(items) as Record<string, any>[];
  result = applyFilters(result, filters);
  result = applySort(result, sortField, sortOrder);

  const limitParam = url.searchParams.get("limit");
  if (limitParam) {
    const limit = Number(limitParam);
    if (!Number.isNaN(limit) && limit > 0) {
      return { data: result.slice(0, limit), total: result.length };
    }
  }

  const paginated = applyPagination(result, url);

  return { data: paginated.data, total: paginated.total };
};

const GRADE_STATUS_META: Record<GradeStatusCode, Omit<GradeStatusMeta, "code">> = {
  PASS: {
    label: "✅ Lulus",
    description: "Nilai memenuhi atau melampaui KKM.",
    tone: "success",
    icon: "check",
  },
  CAUTION: {
    label: "⚠️ Perlu perhatian",
    description: "Nilai mendekati batas KKM dan perlu pemantauan.",
    tone: "warning",
    icon: "alert",
  },
  REMEDIAL: {
    label: "❌ Remedial",
    description: "Nilai di bawah KKM dan membutuhkan tindak lanjut.",
    tone: "danger",
    icon: "x",
  },
};

const resolveGradeStatus = (score: number, kkm: number): GradeStatusMeta => {
  const normalizedKkm = Number.isFinite(kkm) ? kkm : 75;
  let code: GradeStatusCode;
  if (score >= normalizedKkm) {
    code = "PASS";
  } else if (score >= Math.max(normalizedKkm - 10, 0)) {
    code = "CAUTION";
  } else {
    code = "REMEDIAL";
  }
  const meta = GRADE_STATUS_META[code];
  return {
    code,
    ...meta,
  };
};

const numberFromParam = (value: string | null): number | undefined => {
  if (value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const deterministicHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const synthesizeTimestamp = (
  term: { startDate?: string; year?: string; semester?: number } | undefined,
  seed: string,
  variance = 0
) => {
  const fallback = new Date("2024-07-15T07:00:00.000Z");
  const base = term?.startDate ? new Date(term.startDate) : fallback;
  if (Number.isNaN(base.getTime())) {
    base.setTime(fallback.getTime());
  }
  const hash = deterministicHash(`${seed}:${variance}`);
  const dayOffset = hash % 45;
  const minuteOffset = (hash % 6) * 30;
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + dayOffset);
  result.setHours(7 + (hash % 4), minuteOffset, 0, 0);
  return result.toISOString();
};

const GRADE_DISTRIBUTION_BUCKETS = [
  { bucket: "0-59", from: 0, to: 59 },
  { bucket: "60-69", from: 60, to: 69 },
  { bucket: "70-79", from: 70, to: 79 },
  { bucket: "80-89", from: 80, to: 89 },
  { bucket: "90-100", from: 90, to: 100 },
] as const;

const STUDENT_STATUS_LABELS: Record<StudentStatusCode, string> = {
  active: "Aktif",
  inactive: "Tidak aktif",
  alumni: "Alumni",
  graduated: "Lulus",
};

const STUDENT_GENDER_LABELS: Record<StudentGenderCode, string> = {
  M: "Laki-laki",
  F: "Perempuan",
};

const TEACHER_STATUS_LABELS: Record<TeacherStatusCode, string> = {
  active: "Aktif",
  inactive: "Tidak aktif",
  on_leave: "Cuti",
};

const TEACHER_AVAILABILITY_LABELS: Record<TeacherAvailabilityLevel, string> = {
  HIGH: "Sangat tersedia",
  MEDIUM: "Cukup tersedia",
  LOW: "Terbatas",
};

const buildGradeReportResponse = (url: URL): GradeReportResponse => {
  const params = url.searchParams;
  const selectedTermId = params.get("termId");
  const selectedClassId = params.get("classId");
  const selectedSubjectId = params.get("subjectId");
  const selectedComponentId = params.get("componentId");
  const selectedTeacherId = params.get("teacherId");
  const rawStatus = params.get("status");
  const statusParam = (rawStatus ? rawStatus.toUpperCase() : "ALL") as GradeStatusCode | "ALL";
  const searchRaw = params.get("search") ?? params.get("q") ?? "";
  const searchNeedle = searchRaw.trim().toLowerCase();
  const scoreMin = numberFromParam(params.get("scoreMin"));
  const scoreMax = numberFromParam(params.get("scoreMax"));
  const rawPage = numberFromParam(params.get("page")) ?? 1;
  const page = rawPage >= 1 ? rawPage : 1;
  const rawPerPage =
    numberFromParam(params.get("perPage")) ??
    numberFromParam(params.get("pageSize")) ??
    numberFromParam(params.get("limit")) ??
    25;
  const perPage = rawPerPage && rawPerPage > 0 ? rawPerPage : 25;

  const baseRows: GradeReportRow[] = [];
  grades.forEach((grade) => {
    const component = gradeComponentById.get(grade.componentId);
    if (!component) return;

    const classSubject = classSubjectById.get(component.classSubjectId);
    if (!classSubject) return;

    const enrollment = enrollmentById.get(grade.enrollmentId);
    if (!enrollment) return;

    const student = studentById.get(enrollment.studentId);
    if (!student) return;

    const classRecord =
      classById.get(classSubject.classroomId) ?? classById.get(enrollment.classId);
    if (!classRecord) return;

    const subject = subjectById.get(classSubject.subjectId) ?? subjectById.get(grade.subjectId);
    if (!subject) return;

    const teacher = teacherById.get(grade.teacherId) ?? teacherById.get(classSubject.teacherId);
    const gradeConfig = gradeConfigByClassSubject.get(component.classSubjectId);
    const term =
      termById.get(classSubject.termId) ??
      termById.get(classRecord.termId) ??
      termById.get(enrollment.termId);

    const kkm =
      typeof component.kkm === "number"
        ? component.kkm
        : typeof gradeConfig?.kkm === "number"
          ? gradeConfig.kkm
          : 75;
    const status = resolveGradeStatus(grade.score, kkm);
    const componentCategory = component.name.split(" ")[0] ?? component.name;
    const resolvedTeacher = teacher ?? teacherById.get(classSubject.teacherId);
    const fallbackTerm = termById.get(enrollment.termId) ?? termById.get(classRecord.termId);
    const effectiveTerm = term ?? fallbackTerm;
    const recordedAt = synthesizeTimestamp(effectiveTerm, grade.id, 1);
    const lastUpdated = synthesizeTimestamp(effectiveTerm, `${grade.id}:updated`, 5);
    const termName = effectiveTerm?.name ?? fallbackTerm?.name ?? "Tahun Pelajaran";
    const termLabel = effectiveTerm
      ? `${effectiveTerm.year} • Semester ${effectiveTerm.semester}`
      : fallbackTerm
        ? `${fallbackTerm.year} • Semester ${fallbackTerm.semester}`
        : "Tahun Pelajaran Berjalan";

    baseRows.push({
      id: grade.id,
      studentId: student.id,
      studentName: student.fullName,
      studentNis: student.nis,
      classId: classRecord.id,
      className: classRecord.name,
      subjectId: subject.id,
      subjectName: subject.name,
      componentId: component.id,
      componentName: component.name,
      componentCategory,
      componentWeight: component.weight,
      componentDescription: component.description,
      score: grade.score,
      kkm,
      status,
      teacherId: resolvedTeacher?.id ?? classSubject.teacherId,
      teacherName: resolvedTeacher?.fullName ?? "Guru Pengampu",
      recordedAt,
      lastUpdated,
      termId: effectiveTerm?.id ?? fallbackTerm?.id ?? enrollment.termId ?? classRecord.termId,
      termName,
      termLabel,
    });
  });

  const filteredRows = baseRows.filter((row) => {
    if (selectedTermId && row.termId !== selectedTermId) return false;
    if (selectedClassId && row.classId !== selectedClassId) return false;
    if (selectedSubjectId && row.subjectId !== selectedSubjectId) return false;
    if (selectedComponentId && row.componentId !== selectedComponentId) return false;
    if (selectedTeacherId && row.teacherId !== selectedTeacherId) return false;
    if (statusParam !== "ALL" && row.status.code !== statusParam) return false;
    if (typeof scoreMin === "number" && row.score < scoreMin) return false;
    if (typeof scoreMax === "number" && row.score > scoreMax) return false;
    if (searchNeedle.length > 0) {
      const haystack =
        `${row.studentName} ${row.studentNis} ${row.subjectName} ${row.componentName}`.toLowerCase();
      if (!haystack.includes(searchNeedle)) {
        return false;
      }
    }
    return true;
  });

  const totalScores = filteredRows.reduce((acc, row) => acc + row.score, 0);
  const averageScore =
    filteredRows.length > 0 ? Number((totalScores / filteredRows.length).toFixed(1)) : null;
  const sortedByScore = [...filteredRows].sort((a, b) => b.score - a.score);
  const highestRow = sortedByScore[0];
  const lowestRow = sortedByScore[sortedByScore.length - 1];
  const belowKkmCount = filteredRows.filter((row) => row.score < row.kkm).length;
  const remedialCount = filteredRows.filter((row) => row.status.code === "REMEDIAL").length;
  const componentCount = new Set(filteredRows.map((row) => row.componentId)).size;
  const statusBreakdown = (["PASS", "CAUTION", "REMEDIAL"] as GradeStatusCode[]).map((code) => ({
    code,
    label: GRADE_STATUS_META[code].label,
    count: filteredRows.filter((row) => row.status.code === code).length,
  }));
  const distribution = GRADE_DISTRIBUTION_BUCKETS.map((bucket) => ({
    ...bucket,
    count: filteredRows.filter((row) => row.score >= bucket.from && row.score <= bucket.to).length,
  }));

  const sortFieldRaw = params.get("sortField");
  const sortOrderRaw = (params.get("sortOrder") ?? "ascend").toLowerCase();
  const allowedSortFields = new Set<keyof GradeReportRow>([
    "studentName",
    "subjectName",
    "componentName",
    "score",
    "lastUpdated",
  ]);
  const sortField =
    sortFieldRaw && allowedSortFields.has(sortFieldRaw as keyof GradeReportRow)
      ? (sortFieldRaw as keyof GradeReportRow)
      : undefined;
  const sortOrder: "ascend" | "descend" = sortOrderRaw === "descend" ? "descend" : "ascend";

  const dateComparableFields = new Set<keyof GradeReportRow>(["lastUpdated", "recordedAt"]);

  const sortedRows = sortField
    ? [...filteredRows].sort((a, b) => {
        const valueA = a[sortField];
        const valueB = b[sortField];
        if (valueA === valueB) return 0;
        if (valueA === undefined || valueA === null) return 1;
        if (valueB === undefined || valueB === null) return -1;

        if (typeof valueA === "number" && typeof valueB === "number") {
          return sortOrder === "descend" ? valueB - valueA : valueA - valueB;
        }

        if (dateComparableFields.has(sortField)) {
          const timeA = Date.parse(String(valueA));
          const timeB = Date.parse(String(valueB));
          if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) {
            return sortOrder === "descend" ? timeB - timeA : timeA - timeB;
          }
        }

        const stringA = String(valueA ?? "")
          .trim()
          .toLocaleLowerCase("id-ID");
        const stringB = String(valueB ?? "")
          .trim()
          .toLocaleLowerCase("id-ID");
        if (stringA === stringB) return 0;
        const baseComparison = stringA < stringB ? -1 : 1;
        return sortOrder === "descend" ? baseComparison * -1 : baseComparison;
      })
    : filteredRows;

  const total = sortedRows.length;
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const rows = sortedRows.slice(startIndex, startIndex + perPage);

  const filters = {
    terms: terms.map((term) => ({
      id: term.id,
      label: term.name,
      extras: { year: term.year, semester: term.semester, active: term.active },
    })),
    classes: classes.map((klass) => ({
      id: klass.id,
      label: klass.name,
      extras: { level: klass.level, track: klass.track },
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      label: subject.name,
      extras: { code: subject.code },
    })),
    components: gradeComponents.map((component) => {
      const mapping = classSubjectById.get(component.classSubjectId);
      return {
        id: component.id,
        label: component.name,
        extras: {
          subjectId: mapping?.subjectId ?? component.classSubjectId,
          classId: mapping?.classroomId ?? "",
        },
      };
    }),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      label: teacher.fullName,
    })),
    statuses: [
      { value: "ALL" as const, label: "Semua status" },
      { value: "PASS" as const, label: GRADE_STATUS_META.PASS.label },
      { value: "CAUTION" as const, label: GRADE_STATUS_META.CAUTION.label },
      { value: "REMEDIAL" as const, label: GRADE_STATUS_META.REMEDIAL.label },
    ],
  };

  const fallbackRow = rows[0] ?? filteredRows[0] ?? null;
  const contextTermId = selectedTermId ?? fallbackRow?.termId ?? null;
  const contextTerm = contextTermId ? termById.get(contextTermId) : undefined;
  const contextClassId = selectedClassId ?? fallbackRow?.classId ?? null;
  const contextClass = contextClassId ? classById.get(contextClassId) : undefined;
  const contextSubjectId = selectedSubjectId ?? fallbackRow?.subjectId ?? null;
  const contextSubject = contextSubjectId ? subjectById.get(contextSubjectId) : undefined;
  const contextTeacherId = selectedTeacherId ?? fallbackRow?.teacherId ?? null;
  const contextTeacher = contextTeacherId ? teacherById.get(contextTeacherId) : undefined;

  const context = {
    termId: contextTermId,
    termName: contextTerm?.name ?? fallbackRow?.termName ?? null,
    termLabel: contextTerm
      ? `${contextTerm.year} • Semester ${contextTerm.semester}`
      : (fallbackRow?.termLabel ?? null),
    classId: contextClassId,
    className: contextClass?.name ?? fallbackRow?.className ?? null,
    subjectId: contextSubjectId,
    subjectName: contextSubject?.name ?? fallbackRow?.subjectName ?? null,
    teacherId: contextTeacherId,
    teacherName: contextTeacher?.fullName ?? fallbackRow?.teacherName ?? null,
  };

  const summary = {
    averageScore,
    highestScore: highestRow
      ? {
          score: highestRow.score,
          studentId: highestRow.studentId,
          studentName: highestRow.studentName,
          componentName: highestRow.componentName,
          componentCategory: highestRow.componentCategory,
        }
      : undefined,
    lowestScore: lowestRow
      ? {
          score: lowestRow.score,
          studentId: lowestRow.studentId,
          studentName: lowestRow.studentName,
          componentName: lowestRow.componentName,
        }
      : undefined,
    belowKkmCount,
    componentCount,
    remedialCount,
    statusBreakdown,
    distribution,
  };

  const appliedFilters: Record<string, unknown> = {};
  if (selectedTermId) appliedFilters.termId = selectedTermId;
  if (selectedClassId) appliedFilters.classId = selectedClassId;
  if (selectedSubjectId) appliedFilters.subjectId = selectedSubjectId;
  if (selectedComponentId) appliedFilters.componentId = selectedComponentId;
  if (selectedTeacherId) appliedFilters.teacherId = selectedTeacherId;
  if (statusParam && statusParam !== "ALL") appliedFilters.status = statusParam;
  if (searchNeedle.length > 0) appliedFilters.search = searchRaw.trim();
  if (typeof scoreMin === "number") appliedFilters.scoreMin = scoreMin;
  if (typeof scoreMax === "number") appliedFilters.scoreMax = scoreMax;
  if (sortField) {
    appliedFilters.sortField = sortField;
    appliedFilters.sortOrder = sortOrder;
  }
  appliedFilters.page = currentPage;
  appliedFilters.perPage = perPage;

  return {
    context,
    summary,
    filters,
    rows,
    pagination: {
      page: currentPage,
      perPage,
      total,
      totalPages,
    },
    appliedFilters,
  };
};

const buildStudentRosterResponse = (url: URL): StudentRosterResponse => {
  const params = url.searchParams;
  const classIdParam = params.get("classId") ?? undefined;
  const statusParamRaw = params.get("status") ?? undefined;
  const statusParam =
    statusParamRaw && statusParamRaw !== "all" ? (statusParamRaw as StudentStatusCode) : undefined;
  const genderParamRaw = params.get("gender") ?? undefined;
  const genderParam =
    genderParamRaw && genderParamRaw !== "all"
      ? (genderParamRaw.toUpperCase() as StudentGenderCode)
      : undefined;
  const guardianParam = params.get("guardian") ?? undefined;
  const trackParam = params.get("track") ?? undefined;
  const birthYearStart = numberFromParam(params.get("birthYearStart"));
  const birthYearEnd = numberFromParam(params.get("birthYearEnd"));
  const searchRaw = params.get("search") ?? params.get("q") ?? "";
  const searchNeedle = searchRaw.trim().toLowerCase();
  const rawPage = numberFromParam(params.get("page")) ?? 1;
  const page = rawPage >= 1 ? rawPage : 1;
  const rawPerPage =
    numberFromParam(params.get("perPage")) ??
    numberFromParam(params.get("pageSize")) ??
    numberFromParam(params.get("limit")) ??
    20;
  const perPage = rawPerPage && rawPerPage > 0 ? rawPerPage : 20;
  const sortFieldRaw = params.get("sortField");
  const allowedSortFields: StudentRosterSortField[] = [
    "fullName",
    "className",
    "status",
    "nis",
    "lastUpdated",
  ];
  const sortField = allowedSortFields.includes(sortFieldRaw as StudentRosterSortField)
    ? (sortFieldRaw as StudentRosterSortField)
    : undefined;
  const sortOrderRaw = (params.get("sortOrder") ?? "ascend").toLowerCase();
  const sortOrder: "ascend" | "descend" = sortOrderRaw === "descend" ? "descend" : "ascend";

  const rosterRows: StudentRosterRow[] = students.map((student) => {
    const classRecord = classById.get(student.classId);
    const term = classRecord ? termById.get(classRecord.termId) : undefined;
    const homeroom = classRecord ? teacherById.get(classRecord.homeroomId) : undefined;
    const lastUpdated = synthesizeTimestamp(term, `${student.id}:updated`, 3);
    const createdAt = synthesizeTimestamp(term, `${student.id}:created`, 12);

    return {
      id: student.id,
      nis: student.nis,
      fullName: student.fullName,
      preferredName: student.fullName.split(" ")[0] ?? student.fullName,
      gender: student.gender,
      birthDate: student.birthDate,
      birthPlace: undefined,
      classId: classRecord?.id ?? student.classId,
      className: classRecord?.name ?? "Kelas belum ditetapkan",
      classLevel: classRecord?.level ?? 0,
      classTrack: classRecord?.track ?? "IPA",
      homeroomId: classRecord?.homeroomId ?? null,
      homeroomName: homeroom?.fullName ?? undefined,
      status: student.status as StudentStatusCode,
      guardianName: student.guardian,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      emergencyPhone: undefined,
      address: undefined,
      lastUpdated,
      createdAt,
    };
  });

  const filteredRows = rosterRows.filter((row) => {
    if (classIdParam && row.classId !== classIdParam) return false;
    if (statusParam && row.status !== statusParam) return false;
    if (genderParam && row.gender !== genderParam) return false;
    if (trackParam && row.classTrack !== trackParam) return false;
    if (guardianParam) {
      const normalizedGuardian = guardianParam.trim().toLowerCase();
      if (!row.guardianName.toLowerCase().includes(normalizedGuardian)) {
        return false;
      }
    }
    if (typeof birthYearStart === "number" || typeof birthYearEnd === "number") {
      const birthYear = new Date(row.birthDate).getFullYear();
      if (typeof birthYearStart === "number" && birthYear < birthYearStart) return false;
      if (typeof birthYearEnd === "number" && birthYear > birthYearEnd) return false;
    }
    if (searchNeedle.length > 0) {
      const haystack =
        `${row.fullName} ${row.nis} ${row.className} ${row.guardianName}`.toLowerCase();
      if (!haystack.includes(searchNeedle)) {
        return false;
      }
    }
    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortField || sortField === "fullName") {
      const nameA = a.fullName.toLowerCase();
      const nameB = b.fullName.toLowerCase();
      if (nameA === nameB) return a.nis.localeCompare(b.nis);
      const direction = nameA.localeCompare(nameB);
      return sortOrder === "descend" ? -direction : direction;
    }

    if (sortField === "className") {
      const classA = a.className.toLowerCase();
      const classB = b.className.toLowerCase();
      const direction = classA.localeCompare(classB);
      return sortOrder === "descend" ? -direction : direction;
    }

    if (sortField === "status") {
      const direction = a.status.localeCompare(b.status);
      return sortOrder === "descend" ? -direction : direction;
    }

    if (sortField === "nis") {
      const direction = a.nis.localeCompare(b.nis);
      return sortOrder === "descend" ? -direction : direction;
    }

    if (sortField === "lastUpdated") {
      const timeA = Date.parse(a.lastUpdated);
      const timeB = Date.parse(b.lastUpdated);
      const direction = timeA - timeB;
      return sortOrder === "descend" ? -direction : direction;
    }

    return 0;
  });

  const total = sortedRows.length;
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageRows = sortedRows.slice(startIndex, startIndex + perPage);

  const activeStudents = sortedRows.filter((row) => row.status === "active").length;
  const inactiveStudents = sortedRows.filter((row) => row.status === "inactive").length;
  const alumniStudents = sortedRows.filter((row) => row.status === "alumni").length;

  const genderBreakdown = (["M", "F"] as StudentGenderCode[]).map((gender) => ({
    gender,
    label: STUDENT_GENDER_LABELS[gender],
    count: sortedRows.filter((row) => row.gender === gender).length,
  }));

  const classDistributionMap = new Map<string, { className: string; count: number }>();
  sortedRows.forEach((row) => {
    const existing = classDistributionMap.get(row.classId);
    if (existing) {
      existing.count += 1;
    } else {
      classDistributionMap.set(row.classId, { className: row.className, count: 1 });
    }
  });
  const classDistribution = Array.from(classDistributionMap.entries()).map(([classId, value]) => ({
    classId,
    className: value.className,
    count: value.count,
  }));

  const statuses: StudentStatusCode[] = ["active", "inactive", "alumni", "graduated"];
  const statusBreakdown = statuses.map((status) => ({
    status,
    label: STUDENT_STATUS_LABELS[status],
    count: sortedRows.filter((row) => row.status === status).length,
  }));

  const summary = {
    totalStudents: total,
    activeStudents,
    inactiveStudents,
    alumniStudents,
    genderBreakdown,
    classDistribution,
    statusBreakdown,
    activeRate: total > 0 ? Math.round((activeStudents / total) * 1000) / 10 : 0,
  };

  const uniqueGuardians = Array.from(
    new Set(rosterRows.map((row) => row.guardianName).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));

  const uniqueBirthYears = Array.from(
    new Set(
      rosterRows
        .map((row) => new Date(row.birthDate).getFullYear())
        .filter((item) => Number.isFinite(item))
    )
  )
    .sort((a, b) => a - b)
    .map((year) => ({ value: year, label: `Tahun ${year}` }));

  const uniqueTracks = Array.from(new Set(classes.map((klass) => klass.track))).map((track) => ({
    value: track,
    label: `Program ${track}`,
  }));

  const filters = {
    classes: classes.map((klass) => ({
      id: klass.id,
      label: klass.name,
      level: klass.level,
      track: klass.track,
    })),
    statuses: [
      { value: "all" as const, label: "Semua status" },
      { value: "active" as const, label: STUDENT_STATUS_LABELS.active },
      { value: "inactive" as const, label: STUDENT_STATUS_LABELS.inactive },
      { value: "alumni" as const, label: STUDENT_STATUS_LABELS.alumni },
      { value: "graduated" as const, label: STUDENT_STATUS_LABELS.graduated },
    ],
    genders: [
      { value: "all" as const, label: "Semua gender" },
      { value: "M" as const, label: STUDENT_GENDER_LABELS.M },
      { value: "F" as const, label: STUDENT_GENDER_LABELS.F },
    ],
    guardians: uniqueGuardians,
    birthYears: uniqueBirthYears,
    tracks: uniqueTracks,
  };

  const appliedFilters: StudentRosterResponse["appliedFilters"] = {
    page: currentPage,
    perPage,
  };
  if (classIdParam) appliedFilters.classId = classIdParam;
  if (statusParam) appliedFilters.status = statusParam;
  if (genderParam) appliedFilters.gender = genderParam;
  if (guardianParam) appliedFilters.guardian = guardianParam;
  if (typeof birthYearStart === "number") appliedFilters.birthYearStart = birthYearStart;
  if (typeof birthYearEnd === "number") appliedFilters.birthYearEnd = birthYearEnd;
  if (trackParam) appliedFilters.track = trackParam;
  if (searchNeedle.length > 0) appliedFilters.search = searchRaw.trim();
  if (sortField) {
    appliedFilters.sortField = sortField;
    appliedFilters.sortOrder = sortOrder;
  }

  return {
    summary,
    filters,
    rows: pageRows,
    pagination: {
      page: currentPage,
      perPage,
      total,
      totalPages,
    },
    appliedFilters,
  };
};

const buildTeacherRosterResponse = (url: URL): TeacherRosterResponse => {
  const params = url.searchParams;
  const subjectParam = params.get("subjectId") ?? undefined;
  const statusParamRaw = params.get("status") ?? undefined;
  const statusParam =
    statusParamRaw && statusParamRaw !== "all" ? (statusParamRaw as TeacherStatusCode) : undefined;
  const trackParam = params.get("track") ?? undefined;
  const availabilityParamRaw = params.get("availability") ?? undefined;
  const availabilityParam =
    availabilityParamRaw && availabilityParamRaw !== "all"
      ? (availabilityParamRaw.toUpperCase() as TeacherAvailabilityLevel)
      : undefined;
  const homeroomParam = params.get("homeroomClassId") ?? undefined;
  const searchRaw = params.get("search") ?? params.get("q") ?? "";
  const searchNeedle = searchRaw.trim().toLowerCase();
  const rawPage = numberFromParam(params.get("page")) ?? 1;
  const page = rawPage >= 1 ? rawPage : 1;
  const rawPerPage =
    numberFromParam(params.get("perPage")) ??
    numberFromParam(params.get("pageSize")) ??
    numberFromParam(params.get("limit")) ??
    12;
  const perPage = rawPerPage && rawPerPage > 0 ? rawPerPage : 12;
  const sortFieldRaw = params.get("sortField") ?? undefined;
  const allowedSortFields: TeacherRosterSortField[] = [
    "fullName",
    "mainSubjectName",
    "status",
    "assignmentCount",
    "availability",
    "lastUpdated",
  ];
  const sortField = allowedSortFields.includes(sortFieldRaw as TeacherRosterSortField)
    ? (sortFieldRaw as TeacherRosterSortField)
    : undefined;
  const sortOrderRaw = (params.get("sortOrder") ?? "ascend").toLowerCase();
  const sortOrder: "ascend" | "descend" = sortOrderRaw === "descend" ? "descend" : "ascend";

  const rosterRows: TeacherRosterRow[] = teachers.map((teacher) => {
    const mainSubject = teacher.mainSubjectId ? subjectById.get(teacher.mainSubjectId) : undefined;
    const assignments = classSubjectsByTeacher.get(teacher.id) ?? [];
    const assignmentClasses = assignments
      .map((mapping) => classById.get(mapping.classroomId))
      .filter((klass): klass is (typeof classes)[number] => Boolean(klass));
    const trackSet = new Set<string>();
    assignmentClasses.forEach((klass) => trackSet.add(klass.track));
    const homeroom = homeroomClassByTeacher.get(teacher.id);
    if (homeroom) {
      trackSet.add(homeroom.track);
    }
    const preference = teacherPreferenceByTeacher.get(teacher.id);
    const status: TeacherStatusCode = teacher.active ? "active" : "inactive";
    const termIdForTimestamps =
      homeroom?.termId ?? assignmentClasses[0]?.termId ?? terms[0]?.id ?? null;
    const term = termIdForTimestamps ? termById.get(termIdForTimestamps) : undefined;
    const lastUpdated = synthesizeTimestamp(term, `${teacher.id}:updated`, 7);
    const createdAt = synthesizeTimestamp(term, `${teacher.id}:created`, 18);

    return {
      id: teacher.id,
      fullName: teacher.fullName,
      nip: teacher.nip,
      email: teacher.email,
      phone: teacher.phone,
      status,
      mainSubjectId: teacher.mainSubjectId ?? null,
      mainSubjectName: mainSubject?.name ?? "Belum ditetapkan",
      subjectGroup: mainSubject?.group,
      tracks: Array.from(trackSet),
      homeroomClassId: homeroom?.id ?? null,
      homeroomClassName: homeroom?.name ?? null,
      assignmentCount: assignments.length,
      availability: preference?.availabilityLevel ?? null,
      lastUpdated,
      createdAt,
    };
  });

  const filteredRows = rosterRows.filter((row) => {
    if (subjectParam && row.mainSubjectId !== subjectParam) return false;
    if (statusParam && row.status !== statusParam) return false;
    if (trackParam && !row.tracks.includes(trackParam)) return false;
    if (availabilityParam && row.availability !== availabilityParam) return false;
    if (homeroomParam && row.homeroomClassId !== homeroomParam) return false;
    if (searchNeedle.length > 0) {
      const haystack =
        `${row.fullName} ${row.nip} ${row.email} ${row.phone} ${row.mainSubjectName ?? ""}`.toLowerCase();
      if (!haystack.includes(searchNeedle)) return false;
    }
    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const directionMultiplier = sortOrder === "descend" ? -1 : 1;
    switch (sortField) {
      case "mainSubjectName": {
        const nameA = (a.mainSubjectName ?? "").toLowerCase();
        const nameB = (b.mainSubjectName ?? "").toLowerCase();
        return nameA.localeCompare(nameB) * directionMultiplier;
      }
      case "status": {
        return a.status.localeCompare(b.status) * directionMultiplier;
      }
      case "assignmentCount": {
        if (a.assignmentCount === b.assignmentCount) {
          return a.fullName.localeCompare(b.fullName) * directionMultiplier;
        }
        return (a.assignmentCount - b.assignmentCount) * directionMultiplier;
      }
      case "availability": {
        const order: Record<TeacherAvailabilityLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const valA =
          a.availability && order[a.availability] !== undefined ? order[a.availability] : 3;
        const valB =
          b.availability && order[b.availability] !== undefined ? order[b.availability] : 3;
        if (valA === valB) {
          return a.fullName.localeCompare(b.fullName) * directionMultiplier;
        }
        return (valA - valB) * directionMultiplier;
      }
      case "lastUpdated": {
        const timeA = Date.parse(a.lastUpdated);
        const timeB = Date.parse(b.lastUpdated);
        if (timeA === timeB) {
          return a.fullName.localeCompare(b.fullName) * directionMultiplier;
        }
        return (timeA - timeB) * directionMultiplier;
      }
      case "fullName":
      default: {
        const nameA = a.fullName.toLowerCase();
        const nameB = b.fullName.toLowerCase();
        if (nameA === nameB) {
          return a.nip.localeCompare(b.nip) * directionMultiplier;
        }
        return nameA.localeCompare(nameB) * directionMultiplier;
      }
    }
  });

  const total = sortedRows.length;
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageRows = sortedRows.slice(startIndex, startIndex + perPage);

  const activeTeachers = sortedRows.filter((row) => row.status === "active").length;
  const inactiveTeachers = sortedRows.filter((row) => row.status === "inactive").length;
  const homeroomTeachers = sortedRows.filter((row) => Boolean(row.homeroomClassId)).length;

  const subjectDistributionMap = new Map<string, { subjectName: string; count: number }>();
  sortedRows.forEach((row) => {
    if (!row.mainSubjectId) return;
    const subjectName = row.mainSubjectName ?? "Tanpa mapel utama";
    const existing = subjectDistributionMap.get(row.mainSubjectId);
    if (existing) {
      existing.count += 1;
    } else {
      subjectDistributionMap.set(row.mainSubjectId, { subjectName, count: 1 });
    }
  });
  const subjectDistribution = Array.from(subjectDistributionMap.entries())
    .map(([subjectId, value]) => ({
      subjectId,
      subjectName: value.subjectName,
      count: value.count,
    }))
    .sort((a, b) => b.count - a.count);

  const trackDistributionMap = new Map<string, number>();
  sortedRows.forEach((row) => {
    row.tracks.forEach((track) => {
      const next = (trackDistributionMap.get(track) ?? 0) + 1;
      trackDistributionMap.set(track, next);
    });
  });
  const trackDistribution = Array.from(trackDistributionMap.entries())
    .map(([track, count]) => ({
      track,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const availabilityLevels: TeacherAvailabilityLevel[] = ["HIGH", "MEDIUM", "LOW"];
  const availabilityBreakdown = availabilityLevels.map((level) => ({
    level,
    count: sortedRows.filter((row) => row.availability === level).length,
  }));

  const summary = {
    totalTeachers: total,
    activeTeachers,
    inactiveTeachers,
    homeroomTeachers,
    activeRate: total > 0 ? Math.round((activeTeachers / total) * 1000) / 10 : 0,
    subjectDistribution,
    trackDistribution,
    availabilityBreakdown,
  };

  const filters = {
    subjects: subjects.map((subject) => ({
      id: subject.id,
      label: subject.name,
      group: subject.group,
    })),
    statuses: [
      { value: "all" as const, label: "Semua status" },
      { value: "active" as const, label: TEACHER_STATUS_LABELS.active },
      { value: "inactive" as const, label: TEACHER_STATUS_LABELS.inactive },
      { value: "on_leave" as const, label: TEACHER_STATUS_LABELS.on_leave },
    ],
    tracks: Array.from(new Set(classes.map((klass) => klass.track))).map((track) => ({
      value: track,
      label: `Program ${track}`,
    })),
    availabilities: [
      { value: "all" as const, label: "Semua ketersediaan" },
      { value: "HIGH" as const, label: TEACHER_AVAILABILITY_LABELS.HIGH },
      { value: "MEDIUM" as const, label: TEACHER_AVAILABILITY_LABELS.MEDIUM },
      { value: "LOW" as const, label: TEACHER_AVAILABILITY_LABELS.LOW },
    ],
    homerooms: classes
      .filter((klass) => Boolean(klass.homeroomId))
      .map((klass) => ({
        id: klass.id,
        label: `${klass.name} • ${klass.track}`,
      })),
  };

  const appliedFilters: TeacherRosterAppliedFilters = {
    page: currentPage,
    perPage,
  };
  if (subjectParam) appliedFilters.subjectId = subjectParam;
  if (statusParam) appliedFilters.status = statusParam;
  if (trackParam) appliedFilters.track = trackParam;
  if (availabilityParam) appliedFilters.availability = availabilityParam;
  if (homeroomParam) appliedFilters.homeroomClassId = homeroomParam;
  if (searchNeedle.length > 0) appliedFilters.search = searchRaw.trim();
  if (sortField) {
    appliedFilters.sortField = sortField;
    appliedFilters.sortOrder = sortOrder;
  }

  return {
    summary,
    filters,
    rows: pageRows,
    pagination: {
      page: currentPage,
      perPage,
      total,
      totalPages,
    },
    appliedFilters,
  };
};

const findRecord = (resource: ResourceKey, id: string | null) => {
  if (!id) return null;
  return stores[resource].find((item) => String(item.id) === String(id)) ?? null;
};

const syncMockUserRecord = (payload: Record<string, any>, source: Record<string, any>) => {
  if (!payload || !payload.id) {
    return;
  }

  const userId = String(payload.id);
  const existingIndex = mockUsers.findIndex((user) => user.id === userId);
  const existing = existingIndex === -1 ? null : mockUsers[existingIndex];

  const resolvedEmail =
    typeof payload.email === "string" && payload.email.length > 0
      ? payload.email
      : typeof source.email === "string" && source.email.trim().length > 0
        ? source.email.trim().toLowerCase()
        : (existing?.email ?? `${userId}@example.test`);
  const normalizedEmail = resolvedEmail.toLowerCase();

  const resolvedName =
    typeof payload.fullName === "string" && payload.fullName.length > 0
      ? payload.fullName
      : typeof source.fullName === "string" && source.fullName.trim().length > 0
        ? source.fullName.trim()
        : (existing?.fullName ?? resolvedEmail);
  const normalizedName =
    typeof resolvedName === "string" && resolvedName.trim().length > 0
      ? resolvedName.trim()
      : normalizedEmail;

  const resolvedRole = normalizeUserRole(payload.role ?? source.role ?? existing?.role);

  const resolvedPassword =
    typeof source.password === "string" && source.password.trim().length > 0
      ? source.password.trim()
      : (existing?.password ?? DEFAULT_PASSWORD);

  const updated: MockUserRecord = {
    id: userId,
    email: normalizedEmail,
    fullName: normalizedName,
    role: resolvedRole,
    password: resolvedPassword,
    teacherId: normalizeNullableString(
      payload.teacherId ?? source.teacherId ?? existing?.teacherId
    ),
    studentId: normalizeNullableString(
      payload.studentId ?? source.studentId ?? existing?.studentId
    ),
    classId: normalizeNullableString(payload.classId ?? source.classId ?? existing?.classId),
  };

  if (existingIndex === -1) {
    mockUsers.unshift(updated);
  } else {
    mockUsers[existingIndex] = updated;
  }

  if (currentUser?.id === updated.id) {
    currentUser = sanitizeUser(updated);
  }
};

const removeMockUserRecord = (id: string) => {
  const index = mockUsers.findIndex((user) => user.id === id);
  if (index === -1) {
    return;
  }
  const [removed] = mockUsers.splice(index, 1);
  if (currentUser?.id === removed.id) {
    const fallback = mockUsers[0] ?? removed;
    currentUser = sanitizeUser(fallback);
  }
};

const createRecord = (resource: ResourceKey, body: Record<string, any>) => {
  const payload = sanitizePayload(resource, { id: body.id ?? generateId(resource), ...body });
  stores[resource].unshift(payload);
  if (resource === "users") {
    syncMockUserRecord(payload, body ?? {});
  }
  return clone(payload);
};

const updateRecord = (resource: ResourceKey, id: string, body: Record<string, any>) => {
  const store = stores[resource];
  const index = store.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return null;
  }
  const merged = { ...store[index], ...body, id: store[index].id };
  const payload = sanitizePayload(resource, merged);
  store[index] = payload;
  if (resource === "users") {
    syncMockUserRecord(payload, body ?? {});
  }
  return clone(payload);
};

const deleteRecord = (resource: ResourceKey, id: string) => {
  const store = stores[resource];
  const index = store.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return null;
  }
  const [removed] = store.splice(index, 1);
  if (resource === "users") {
    removeMockUserRecord(String(id));
  }
  return clone(removed);
};

// Expose minimal helpers so tests can reuse the same in-memory fixtures.
export const mswTestUtils = {
  list(resource: ResourceKey) {
    return clone(stores[resource]);
  },
  create(resource: ResourceKey, body: Record<string, any>) {
    return createRecord(resource, body ?? {});
  },
  remove(resource: ResourceKey, id: string) {
    return deleteRecord(resource, id);
  },
  listUsers() {
    return clone(stores.users);
  },
  getCurrentUser() {
    return clone(currentUser);
  },
  setCurrentUser(selector: { email?: string; role?: string }) {
    const candidate =
      findUserByEmail(selector?.email ?? undefined) ?? findUserByRole(selector?.role ?? undefined);

    if (!candidate) {
      throw new Error(
        `[MSW] Unable to locate mock user for selector ${JSON.stringify(selector ?? {})}`
      );
    }

    currentUser = sanitizeUser(candidate);
    return clone(currentUser);
  },
  getDashboard() {
    return clone(principalDashboard);
  },
  setDashboard(
    updater:
      | Partial<typeof principalDashboard>
      | ((current: typeof principalDashboard) => Partial<typeof principalDashboard>)
  ) {
    const next =
      typeof updater === "function"
        ? { ...principalDashboard, ...(updater(clone(principalDashboard)) ?? {}) }
        : { ...principalDashboard, ...(updater ?? {}) };
    Object.assign(principalDashboard, next);
    return clone(principalDashboard);
  },
  getAttendanceSummary({
    classId,
    startDate,
    endDate,
  }: {
    classId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const parseDate = (value?: string) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00Z`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const weekKey = (value: string) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      const jsDay = parsed.getUTCDay(); // 0-6
      const diff = (jsDay + 6) % 7;
      const monday = new Date(parsed);
      monday.setUTCDate(parsed.getUTCDate() - diff);
      return monday.toISOString().slice(0, 10);
    };

    const filtered = attendance.filter((record) => {
      if (classId && record.classId !== classId) {
        return false;
      }
      const recordDate = parseDate(record.date);
      if (!recordDate) {
        return false;
      }
      if (start && recordDate < start) {
        return false;
      }
      if (end && recordDate > end) {
        return false;
      }
      return true;
    });

    const byStatus: Record<string, number> = { H: 0, I: 0, S: 0, A: 0 };
    const weeklyAlpha: Record<string, number> = {};
    const weeklyAttendance: Record<string, { present: number; total: number }> = {};

    filtered.forEach((record) => {
      const statusKey = String(record.status ?? "").toUpperCase();
      if (statusKey in byStatus) {
        byStatus[statusKey] += 1;
      }

      const week = weekKey(record.date);
      if (!weeklyAttendance[week]) {
        weeklyAttendance[week] = { present: 0, total: 0 };
      }
      weeklyAttendance[week].total += 1;
      if (statusKey === "H") {
        weeklyAttendance[week].present += 1;
      }

      if (statusKey === "A") {
        weeklyAlpha[week] = (weeklyAlpha[week] ?? 0) + 1;
      }
    });

    return {
      total: filtered.length,
      byStatus,
      weeklyAlpha,
      weeklyAttendance,
    };
  },
  getSemesterSchedule(classId?: string) {
    const slots = clone(semesterSchedule);
    if (!classId) {
      return slots;
    }
    return slots.filter((slot) => slot.classId === classId);
  },
  upsertTeacherPreference(teacherId: string, payload: Partial<TeacherPreferenceRecord>) {
    const prefIndex = teacherPreferences.findIndex((pref) => pref.teacherId === teacherId);
    const now = new Date().toISOString();
    const base = {
      preferredDays: [1, 2, 3, 4, 5],
      blockedDays: [],
      preferredSlots: [1, 2, 3, 4],
      maxDailySessions: 3,
      availabilityLevel: "HIGH" as const,
      notes: "",
    };
    const updated = {
      id: prefIndex === -1 ? `pref_${teacherId}_${now}` : teacherPreferences[prefIndex].id,
      teacherId,
      ...base,
      ...(payload ?? {}),
    } satisfies TeacherPreferenceRecord;

    if (prefIndex === -1) {
      teacherPreferences.push(updated);
    } else {
      teacherPreferences[prefIndex] = updated;
    }
    stores["teacher-preferences"] = teacherPreferences;
    return clone(updated);
  },
};

// Simulation flags (toggle via query param or by editing these vars during dev)
let simulateRefreshFailure = false;
let simulateSessionExpiry = false;

export function setSimulation({
  refreshFailure,
  sessionExpiry,
}: {
  refreshFailure?: boolean;
  sessionExpiry?: boolean;
}) {
  if (typeof refreshFailure === "boolean") simulateRefreshFailure = refreshFailure;
  if (typeof sessionExpiry === "boolean") simulateSessionExpiry = sessionExpiry;
}

export async function createHandlers() {
  const authLoginRegex = /\/(?:api(?:\/v1)?)?\/auth\/login$/;
  const authMeRegex = /\/(?:api(?:\/v1)?)?\/auth\/me$/;
  const authLogoutRegex = /\/(?:api(?:\/v1)?)?\/auth\/logout$/;
  const authRefreshRegex = /\/(?:api(?:\/v1)?)?\/auth\/refresh$/;

  return [
    http.post(authLoginRegex, async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
      };
      const { email, password } = body || {};
      const candidate = findUserByEmail(email ?? null);
      const isPasswordValid =
        candidate && (candidate.password === undefined || candidate.password === password);

      if (!candidate || !isPasswordValid) {
        return HttpResponse.json({ message: "Invalid email or password" }, { status: 401 });
      }

      const sanitized = sanitizeUser(candidate);
      currentUser = sanitized;

      const payload = {
        accessToken: `mock-access-token-${candidate.id}`,
        refreshToken: `mock-refresh-token-${candidate.id}`,
        access_token: `mock-access-token-${candidate.id}`,
        refresh_token: `mock-refresh-token-${candidate.id}`,
        expiresIn: 3600,
        refreshExpiresIn: 86400,
        tokenType: "Bearer",
        user: sanitized,
      };

      return HttpResponse.json(
        {
          ...payload,
          data: payload,
          result: payload,
        },
        { status: 200 }
      );
    }),

    http.get(authMeRegex, ({ request }) => {
      const auth = request.headers.get("authorization");
      if (!auth?.startsWith("Bearer mock-access-token")) {
        return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      return HttpResponse.json(currentUser, { status: 200 });
    }),

    http.post(authLogoutRegex, () => {
      currentUser = sanitizeUser(mockUsers[0]);
      return HttpResponse.json({ success: true }, { status: 200 });
    }),

    http.post(authRefreshRegex, async ({ request }) => {
      const url = new URL(request.url);
      if (simulateRefreshFailure || url.searchParams.get("fail") === "1") {
        return HttpResponse.json({ message: "Refresh token expired" }, { status: 401 });
      }

      if (simulateSessionExpiry || url.searchParams.get("expire") === "1") {
        return HttpResponse.json({ message: "Session expired" }, { status: 403 });
      }

      return HttpResponse.json(
        { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" },
        { status: 200 }
      );
    }),

    http.get(/\/api(?:\/v1)?\/dashboard\/academics$/, () =>
      HttpResponse.json(principalDashboard, { status: 200 })
    ),

    http.post(/\/api(?:\/v1)?\/schedule\/generate$/, async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        classId?: string;
        termId?: string;
      };
      const targetClassId = body.classId ?? classes[0]?.id;
      if (!targetClassId) {
        return HttpResponse.json({ message: "Class not found" }, { status: 404 });
      }

      const relevantSlots = semesterSchedule.filter((slot) => slot.classId === targetClassId);
      if (relevantSlots.length === 0) {
        return HttpResponse.json(
          { slots: [], summary: { preferenceMatches: 0, compromise: 0, empty: 0, confidence: 0 } },
          { status: 200 }
        );
      }

      const preferenceByTeacher = new Map<string, TeacherPreferenceRecord>();
      teacherPreferences.forEach((pref) => {
        preferenceByTeacher.set(pref.teacherId, pref);
      });

      const generated = relevantSlots.map((slot) => {
        if (!slot.teacherId || !slot.subjectId) {
          return { ...slot, status: "EMPTY" as const };
        }
        const pref = preferenceByTeacher.get(slot.teacherId);
        const preferredDay = pref ? pref.preferredDays.includes(slot.dayOfWeek) : false;
        const preferredSlot = pref ? pref.preferredSlots.includes(slot.slot) : false;
        const blocked = pref ? pref.blockedDays.includes(slot.dayOfWeek) : false;
        let status: "PREFERENCE" | "COMPROMISE" | "CONFLICT" = "PREFERENCE";
        if (blocked) {
          status = "CONFLICT";
        } else if (!(preferredDay && preferredSlot)) {
          status = "COMPROMISE";
        }
        return { ...slot, status };
      });

      const preferenceMatches = generated.filter((slot) => slot.status === "PREFERENCE").length;
      const conflicts = generated.filter((slot) => slot.status === "CONFLICT").length;
      const assigned = generated.filter((slot) => slot.teacherId && slot.subjectId).length;
      const empty = generated.length - assigned;
      const compromise = assigned - preferenceMatches - conflicts;
      const confidence =
        assigned === 0 ? 0 : Number(((preferenceMatches / assigned) * 100).toFixed(1));

      return HttpResponse.json(
        {
          slots: generated,
          summary: {
            preferenceMatches,
            compromise,
            conflicts,
            empty,
            confidence,
          },
        },
        { status: 200 }
      );
    }),

    http.post(/\/api(?:\/v1)?\/schedule\/save$/, async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        classId?: string;
        slots?: SemesterScheduleSlotRecord[];
      };
      if (!body.classId || !Array.isArray(body.slots)) {
        return HttpResponse.json({ message: "Invalid payload" }, { status: 400 });
      }

      const remaining = semesterSchedule.filter((slot) => slot.classId !== body.classId);
      const sanitizedSlots = body.slots.map((slot) => ({
        ...slot,
        classId: body.classId,
      }));
      semesterSchedule.length = 0;
      semesterSchedule.push(...remaining, ...sanitizedSlots);
      stores["semester-schedule"] = semesterSchedule;

      return HttpResponse.json({ success: true, count: sanitizedSlots.length }, { status: 200 });
    }),

    http.get(/\/api(?:\/v1)?\/grades\/report$/, ({ request }) => {
      const url = new URL(request.url);
      const payload = buildGradeReportResponse(url);
      return HttpResponse.json(payload, { status: 200 });
    }),
    http.get(/\/api(?:\/v1)?\/students\/roster$/, ({ request }) => {
      const url = new URL(request.url);
      const payload = buildStudentRosterResponse(url);
      return HttpResponse.json(payload, { status: 200 });
    }),

    http.get(/\/api(?:\/v1)?\/grades\/report$/, ({ request }) => {
      const url = new URL(request.url);
      const payload = buildGradeReportResponse(url);
      return HttpResponse.json(payload, { status: 200 });
    }),

    http.get(/\/api(?:\/v1)?\/students\/roster$/, ({ request }) => {
      const url = new URL(request.url);
      const payload = buildStudentRosterResponse(url);
      return HttpResponse.json(payload, { status: 200 });
    }),

    http.get(/\/api(?:\/v1)?\/teachers\/roster$/, ({ request }) => {
      const url = new URL(request.url);
      const payload = buildTeacherRosterResponse(url);
      return HttpResponse.json(payload, { status: 200 });
    }),

    http.post(/\/api(?:\/v1)?\/mutations\/([^/?]+)\/review$/, async ({ request }) => {
      const match = new URL(request.url).pathname.match(/\/mutations\/([^/?]+)\/review$/);
      const id = match?.[1] ?? "";
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const status = String(body.status ?? "").toUpperCase();
      if (status !== "APPROVED" && status !== "REJECTED") {
        return HttpResponse.json(
          { message: "status must be APPROVED or REJECTED" },
          { status: 400 }
        );
      }
      const existing = findRecord("mutations", id);
      if (!existing) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }
      const updated = updateRecord("mutations", id, {
        status,
        note: body.note ?? null,
        reviewedBy: "user_superadmin",
        reviewedAt: new Date().toISOString(),
      });
      return HttpResponse.json(updated, { status: 200 });
    }),

    http.post(/\/api(?:\/v1)?\/archives$/, async ({ request }) => {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return HttpResponse.json({ message: "invalid upload" }, { status: 400 });
      }
      const file = formData.get("file") as File | null;
      const record = createRecord("archives", {
        title: String(formData.get("title") ?? "") || file?.name || "Untitled",
        category: String(formData.get("category") ?? ""),
        scope: String(formData.get("scope") ?? "GLOBAL").toUpperCase(),
        refTermId: (formData.get("refTermId") as string) || null,
        refClassId: (formData.get("refClassId") as string) || null,
        refStudentId: (formData.get("refStudentId") as string) || null,
        filePath: file?.name ?? "",
        fileName: file?.name ?? "",
        mimeType: file?.type ?? "application/octet-stream",
        sizeBytes: file?.size ?? 0,
        fileSize: file?.size ?? 0,
        uploadedBy: "user_admin_tu",
        generatedBy: "user_admin_tu",
        uploadedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        downloadUrl: `https://example-cdn.local/files/${file?.name ?? "archive"}`,
      });
      return HttpResponse.json(record, { status: 201 });
    }),

    http.get(/\/api(?:\/v1)?\/archives\/([^/?]+)\/download$/, ({ request }) => {
      const token = new URL(request.url).searchParams.get("token");
      if (!token) {
        return HttpResponse.json({ message: "token required" }, { status: 400 });
      }
      return HttpResponse.text("mock archive content", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="archive.csv"' },
      });
    }),

    http.post(/\/api(?:\/v1)?\/reports\/generate$/, async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const job = {
        id: generateId("report"),
        type: String(body.type ?? "summary"),
        termId: String(body.termId ?? ""),
        classId: body.classId ?? null,
        format: String(body.format ?? "csv"),
        status: "QUEUED",
        progress: 0,
        resultUrl: null,
        error: null,
        createdAt: new Date().toISOString(),
      };
      reportJobs.push(job);
      return HttpResponse.json(
        { id: job.id, status: job.status, progress: job.progress },
        { status: 202 }
      );
    }),

    http.get(/\/api(?:\/v1)?\/reports\/status\/([^/?]+)$/, ({ request }) => {
      const match = new URL(request.url).pathname.match(/\/reports\/status\/([^/?]+)$/);
      const id = match?.[1] ?? "";
      const job = reportJobs.find((j) => j.id === id);
      if (!job) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }
      if (job.status === "QUEUED" || job.status === "PROCESSING") {
        job.status = "PROCESSING";
        job.progress = Math.min(100, job.progress + 25);
        if (job.progress >= 100) {
          job.status = "FINISHED";
          job.resultUrl = `https://example-cdn.local/exports/${job.id}.${job.format}`;
        }
      }
      return HttpResponse.json(
        {
          id: job.id,
          status: job.status,
          progress: job.progress,
          resultUrl: job.resultUrl,
          error: job.error,
        },
        { status: 200 }
      );
    }),

    http.get(/\/api(?:\/v1)?\/export\/([^/?]+)$/, () =>
      HttpResponse.text("mock exported report", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="report.csv"' },
      })
    ),

    http.get(resourcePathRegex, ({ request }) => {
      const parsed = parseResourceRequest(request);
      if (!parsed) {
        return HttpResponse.json({ message: "Not mocked in MSW" }, { status: 404 });
      }
      const { resource, id, url } = parsed;
      if (id) {
        const record = findRecord(resource, id);
        if (!record) {
          return HttpResponse.json({ message: "Not found" }, { status: 404 });
        }
        return HttpResponse.json(record, { status: 200 });
      }
      const payload = buildListResponse(resource, url);
      return HttpResponse.json(payload, { status: 200 });
    }),

    http.post(resourcePathRegex, async ({ request }) => {
      const parsed = parseResourceRequest(request);
      if (!parsed || parsed.id) {
        return HttpResponse.json({ message: "Not mocked in MSW" }, { status: 404 });
      }
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const created = createRecord(parsed.resource, body ?? {});
      return HttpResponse.json(created, { status: 201 });
    }),

    http.patch(resourcePathRegex, async ({ request }) => {
      const parsed = parseResourceRequest(request);
      if (!parsed || !parsed.id) {
        return HttpResponse.json({ message: "Not mocked in MSW" }, { status: 404 });
      }
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const updated = updateRecord(parsed.resource, parsed.id, body ?? {});
      if (!updated) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }
      return HttpResponse.json(updated, { status: 200 });
    }),

    http.delete(resourcePathRegex, ({ request }) => {
      const parsed = parseResourceRequest(request);
      if (!parsed || !parsed.id) {
        return HttpResponse.json({ message: "Not mocked in MSW" }, { status: 404 });
      }
      const removed = deleteRecord(parsed.resource, parsed.id);
      if (!removed) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }
      return HttpResponse.json(removed, { status: 200 });
    }),

    http.all(/\/api(?:\/v1)?\/.*$/, () =>
      HttpResponse.json({ message: "Not mocked in MSW" }, { status: 404 })
    ),
  ];
}

const defaultHandlers = await createHandlers();

export default defaultHandlers;
