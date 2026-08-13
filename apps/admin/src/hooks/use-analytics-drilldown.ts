import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { httpClient } from "../providers/dataProvider";

export type AnalyticsResource = "class" | "student" | "subject";
export type AnalyticsMetric = "gpa" | "attendance" | "behavior";

export type AnalyticsClassStudent = {
  studentId: string;
  studentName: string;
  nis: string;
  gpa: number;
  attendancePercentage: number;
  rank: number;
};

export type AnalyticsClassSubject = {
  subjectId: string;
  subjectName: string;
  totalStudents: number;
  averageGrade: number;
  passRate: number;
};

export type AnalyticsClass = {
  classId: string;
  className: string;
  grade: string;
  track: string;
  termId: string;
  termName: string;
  totalStudents: number;
  totalSubjects: number;
  averageAttendance: number;
  averageGrade: number;
  studentsPassed: number;
  studentsFailed: number;
  students: AnalyticsClassStudent[];
  subjectPerformance: AnalyticsClassSubject[];
};

export type AnalyticsStudent = {
  studentId: string;
  nis: string;
  studentName: string;
  classId: string;
  className: string;
  termId: string;
  termName: string;
  performance: {
    gpa: number;
    rank: number;
    totalRank: number;
    subjectsEnrolled: number;
    subjectsPassed: number;
    subjectsFailed: number;
    lowestGrade: number;
    highestGrade: number;
  };
  attendance: {
    percentage: number;
    totalDays: number;
    present: number;
    sick: number;
    permission: number;
    absent: number;
  };
  behavior: {
    totalPoints: number;
    positiveNotes: number;
    negativeNotes: number;
    neutralNotes: number;
  };
  subjectBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    finalGrade: number;
  }>;
};

export type AnalyticsSubject = {
  subjectId: string;
  subjectName: string;
  termId: string;
  overall: {
    totalStudents: number;
    averageGrade: number;
    gradeStddev: number;
    minGrade: number;
    maxGrade: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
  };
  byClass: Array<{
    classId: string;
    className: string;
    totalStudents: number;
    averageGrade: number;
    passRate: number;
  }>;
  gradeDistribution: Record<string, number>;
  topPerformers: Array<{
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    grade: number;
  }>;
};

export type AnalyticsDetail = AnalyticsClass | AnalyticsStudent | AnalyticsSubject;

export type AnalyticsLeaderboard = {
  termId: string;
  classId?: string;
  metric: AnalyticsMetric;
  leaderboard: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    nis: string;
    classId: string;
    className: string;
    score: number;
    points?: number;
  }>;
};

export type AnalyticsQuery = {
  termId: string;
  classId?: string;
  limit?: number;
};

/** Build the snake_case query required by the Go analytics handlers. */
export const buildAnalyticsQuery = ({ termId, classId, limit }: AnalyticsQuery) => {
  const query: Record<string, string> = { term_id: termId };
  if (classId) query.class_id = classId;
  if (typeof limit === "number") query.limit = String(limit);
  return query;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const snakeToCamel = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

/** Normalize API response keys without weakening the typed hook boundary. */
export const normalizeAnalyticsPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeAnalyticsPayload);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      snakeToCamel(key),
      normalizeAnalyticsPayload(entry),
    ])
  );
};

export const unwrapAnalyticsPayload = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return "data" in value ? value.data : value;
};

const fetchAnalytics = async <T>(url: string, params: Record<string, string>): Promise<T> => {
  const response = await httpClient.get<unknown>(url, { params });
  return normalizeAnalyticsPayload(unwrapAnalyticsPayload(response.data)) as T;
};

export type UseAnalyticsDrilldownArgs = {
  resource: AnalyticsResource;
  resourceId?: string;
  termId?: string;
  classId?: string;
  limit?: number;
};

export const useAnalyticsDrilldown = ({
  resource,
  resourceId,
  termId,
  classId,
  limit = 10,
}: UseAnalyticsDrilldownArgs): {
  detail: UseQueryResult<AnalyticsDetail, Error>;
  leaderboards: Record<AnalyticsMetric, UseQueryResult<AnalyticsLeaderboard, Error>>;
} => {
  const enabled = Boolean(resourceId && termId);
  const detail = useQuery<AnalyticsDetail, Error>({
    queryKey: ["analytics-drilldown", resource, resourceId, termId, classId],
    queryFn: () =>
      fetchAnalytics<AnalyticsDetail>(
        `/analytics/${resource}/${encodeURIComponent(resourceId ?? "")}`,
        buildAnalyticsQuery({
          termId: termId ?? "",
          classId: resource === "subject" ? classId : undefined,
        })
      ),
    enabled,
    staleTime: 60_000,
  });

  const leaderboardQuery = (metric: AnalyticsMetric) => ({
    queryKey: ["analytics-leaderboard", metric, termId, classId, limit],
    queryFn: () =>
      fetchAnalytics<AnalyticsLeaderboard>(
        `/analytics/leaderboard/${metric}`,
        buildAnalyticsQuery({ termId: termId ?? "", classId, limit })
      ),
    enabled: Boolean(termId),
    staleTime: 60_000,
  });

  // Keep the metric calls explicit so React's hook order remains stable. The
  // query option builder is deliberately not a hook, avoiding conditional
  // hook calls while sharing the endpoint configuration.
  const gpa = useQuery<AnalyticsLeaderboard, Error>(leaderboardQuery("gpa"));
  const attendance = useQuery<AnalyticsLeaderboard, Error>(leaderboardQuery("attendance"));
  const behavior = useQuery<AnalyticsLeaderboard, Error>(leaderboardQuery("behavior"));

  return { detail, leaderboards: { gpa, attendance, behavior } };
};
