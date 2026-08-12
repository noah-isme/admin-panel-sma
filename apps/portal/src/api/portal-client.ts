import type {
  PortalAnnouncementsQuery,
  PortalAnnouncementsResponse,
  PortalAttendanceQuery,
  PortalAttendanceResponse,
  PortalBehaviorQuery,
  PortalBehaviorResponse,
  PortalCalendarQuery,
  PortalCalendarResponse,
  PortalGradesQuery,
  PortalGradesResponse,
  PortalLoginRequest,
  PortalLoginResponse,
  PortalUserInfo,
} from "@portal-types";

export interface PortalReportCard {
  studentId: string;
  studentName: string;
  nis: string;
  className: string;
  termId: string;
  termName: string;
  grades: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    finalGrade: number;
    letterGrade: string;
    isPassed: boolean;
    teacherName?: string;
  }>;
  summary: {
    gpa: number;
    rank?: number;
    totalStudents?: number;
    passedSubjects: number;
    failedSubjects: number;
  };
  attendanceSummary?: PortalAttendanceResponse["summary"];
  behaviorSummary?: Pick<
    PortalBehaviorResponse["summary"],
    "totalPoints" | "positiveNotes" | "negativeNotes"
  >;
}

export interface PortalHomeroom {
  studentId: string;
  studentName: string;
  termId: string;
  termName: string;
  classId: string;
  className: string;
  homeroomTeacher?: { id: string; name: string };
}

export interface PortalClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

type PortalWireUserInfo = Omit<PortalUserInfo, "role" | "portalRole"> & {
  role: string;
  portalRole: string;
};
type PortalWireLoginResponse = Omit<PortalLoginResponse, "user"> & { user: PortalWireUserInfo };

export class PortalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "PortalApiError";
  }
}

type QueryValue = string | number | boolean | undefined;

function toQuery(query: object = {}): string {
  const params = new URLSearchParams();
  Object.entries(query as Record<string, QueryValue>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
  }
  return fallback;
}

function normalizePortalUser(user: PortalWireUserInfo): PortalUserInfo {
  const role: PortalUserInfo["role"] =
    user.role === "ORTU"
      ? "PARENT"
      : user.role === "SISWA"
        ? "STUDENT"
        : (user.role as PortalUserInfo["role"]);
  const portalRole: PortalUserInfo["portalRole"] =
    user.portalRole === "ORTU"
      ? "PARENT"
      : user.portalRole === "SISWA"
        ? "STUDENT"
        : (user.portalRole as PortalUserInfo["portalRole"]);
  return { ...user, role, portalRole };
}

function normalizeLoginResponse(response: PortalWireLoginResponse): PortalLoginResponse {
  return { ...response, user: normalizePortalUser(response.user) };
}

export function createPortalClient(options: PortalClientOptions = {}) {
  const baseUrl = (
    options.baseUrl ??
    import.meta.env.VITE_PORTAL_API_URL ??
    "/api/v1/portal"
  ).replace(/\/$/, "");
  const fetchFn = options.fetchFn ?? fetch;

  async function request<T>(
    path: string,
    init: RequestInit = {},
    accessToken?: string
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetchFn(`${baseUrl}${path}`, { ...init, headers });
    if (response.status === 204) return undefined as T;
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok)
      throw new PortalApiError(
        errorMessage(payload, "Permintaan tidak dapat diproses."),
        response.status
      );
    return unwrap<T>(payload);
  }

  const withStudent = <T extends object>(query: T, studentId?: string) => ({ ...query, studentId });

  return {
    login: async (body: PortalLoginRequest) =>
      normalizeLoginResponse(
        await request<PortalWireLoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ),
    refresh: async (refreshToken: string) =>
      normalizeLoginResponse(
        await request<PortalWireLoginResponse>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      ),
    logout: (refreshToken: string, accessToken?: string) =>
      request<void>(
        "/auth/logout",
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        accessToken
      ),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    grades: (query: PortalGradesQuery, accessToken: string) =>
      request<PortalGradesResponse>(`/grades${toQuery(query)}`, {}, accessToken),
    reportCard: (query: Pick<PortalGradesQuery, "termId" | "studentId">, accessToken: string) =>
      request<PortalReportCard>(`/grades/report-card${toQuery(query)}`, {}, accessToken),
    attendance: (query: PortalAttendanceQuery, accessToken: string) =>
      request<PortalAttendanceResponse>(`/attendance${toQuery(query)}`, {}, accessToken),
    announcements: (query: PortalAnnouncementsQuery, accessToken: string) =>
      request<PortalAnnouncementsResponse>(`/announcements${toQuery(query)}`, {}, accessToken),
    behavior: (query: PortalBehaviorQuery, accessToken: string) =>
      request<PortalBehaviorResponse>(`/behavior-notes${toQuery(query)}`, {}, accessToken),
    calendar: (query: PortalCalendarQuery, accessToken: string) =>
      request<PortalCalendarResponse>(`/calendar${toQuery(query)}`, {}, accessToken),
    homeroom: (query: Pick<PortalGradesQuery, "termId" | "studentId">, accessToken: string) =>
      request<PortalHomeroom>(`/homeroom${toQuery(query)}`, {}, accessToken),
    withStudent,
  };
}

export const portalClient = createPortalClient();
