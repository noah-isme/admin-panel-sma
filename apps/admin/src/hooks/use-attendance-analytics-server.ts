import { useCallback, useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import { httpClient } from "../providers/dataProvider";
import { resolveActiveTerm } from "../utils/terms";

export type AttendanceStatus = "H" | "I" | "S" | "A";

type TermRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
  isActive?: boolean;
};

type ClassRecord = {
  id: string;
  name: string;
  code: string;
  termId: string;
};

export type AttendanceAnalyticsFilters = {
  termId?: string;
  classId?: string;
  range?: { start: string; end: string };
  statuses?: AttendanceStatus[];
};

export type StudentAttendanceSummary = {
  studentId: string;
  studentName: string;
  nis: string;
  status: "active" | "inactive";
  counts: Record<AttendanceStatus, number>;
  total: number;
  percentage: number;
  behaviorNotes?: number;
};

export type WeeklyAlphaPoint = {
  week: string;
  alpha: number;
};

export type WeeklyAttendancePoint = {
  week: string;
  attendance: number;
};

export type AttendanceAnalyticsResult = {
  terms: TermRecord[];
  classes: ClassRecord[];
  selectedTerm: TermRecord | null;
  selectedClass: ClassRecord | null;
  dateRange: { start: string; end: string };
  statuses: AttendanceStatus[];
  studentSummaries: StudentAttendanceSummary[];
  weeklyAlpha: WeeklyAlphaPoint[];
  weeklyAttendance: WeeklyAttendancePoint[];
  stats: {
    averageAttendance: number;
    totalSessions: number;
    alphaTotal: number;
    latestAbsenceCount: number;
    latestAbsenceDate?: string;
    topStudents: StudentAttendanceSummary[];
  };
  isLoading: boolean;
  isFetching: boolean;
};

const STATUS_VALUES: AttendanceStatus[] = ["H", "I", "S", "A"];

const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  H: { label: "Hadir", color: "success" },
  I: { label: "Izin", color: "warning" },
  S: { label: "Sakit", color: "processing" },
  A: { label: "Alfa", color: "error" },
};

const clampDate = (value?: string, fallback?: string) => {
  const date = value ? dayjs(value) : null;
  if (date && date.isValid()) {
    return date.format("YYYY-MM-DD");
  }
  if (fallback) {
    const fb = dayjs(fallback);
    if (fb.isValid()) {
      return fb.format("YYYY-MM-DD");
    }
  }
  return dayjs().format("YYYY-MM-DD");
};

const getWeekStart = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  const diff = (parsed.day() + 6) % 7;
  return parsed.subtract(diff, "day").startOf("day").format("YYYY-MM-DD");
};

const toPercent = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
};

type BackendAttendanceSummaryResponse = {
  scope: {
    termId: string;
    classId?: string | null;
    studentId?: string | null;
  };
  summary: {
    totalDays: number;
    present: number;
    sick: number;
    excused: number;
    absent: number;
    attendanceRate: number;
  };
  perStudent: Array<{
    studentId: string;
    studentName: string;
    classId: string;
    present: number;
    sick: number;
    excused: number;
    absent: number;
    attendanceRate: number;
  }>;
};

export const useAttendanceAnalyticsServer = (
  filters: AttendanceAnalyticsFilters = {}
): AttendanceAnalyticsResult => {
  const [serverData, setServerData] = useState<BackendAttendanceSummaryResponse | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch minimal reference data only (terms, classes for dropdowns)
  const termsQuery = useList<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 20 },
    sorters: [{ field: "startDate", order: "asc" }],
    queryOptions: { staleTime: 1000 * 60 * 5 },
  });

  const classesQuery = useList<ClassRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { keepPreviousData: true },
  });

  // Fetch detailed analytics from backend /attendance endpoint
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchAnalytics = async () => {
      if (!filters.termId) {
        setServerData(null);
        setServerLoading(false);
        return;
      }

      setServerLoading(true);
      setServerError(null);

      try {
        const params = new URLSearchParams();
        params.set("termId", filters.termId);
        if (filters.classId) params.set("classId", filters.classId);
        if (filters.range?.start) params.set("from", filters.range.start);
        if (filters.range?.end) params.set("to", filters.range.end);

        const res = await httpClient.get(`/attendance?${params.toString()}`, {
          signal,
        });

        // Handle both enveloped and bare responses
        const body = res?.data;
        const data = body && typeof body === "object" && "data" in body ? body.data : body;

        setServerData(data as BackendAttendanceSummaryResponse);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setServerError(error instanceof Error ? error.message : "Failed to fetch analytics");
        setServerData(null);
      } finally {
        setServerLoading(false);
      }
    };

    fetchAnalytics();

    return () => controller.abort();
  }, [filters.termId, filters.classId, filters.range?.start, filters.range?.end]);

  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data?.data]);
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data?.data]);

  const selectedTerm = useMemo(() => {
    if (filters.termId) {
      return terms.find((term) => term.id === filters.termId) ?? null;
    }
    return resolveActiveTerm(terms);
  }, [filters.termId, terms]);

  const classesInTerm = useMemo(() => {
    if (!selectedTerm) {
      return classes;
    }
    return classes.filter((klass) => klass.termId === selectedTerm.id);
  }, [classes, selectedTerm]);

  const selectedClass = useMemo(() => {
    if (filters.classId) {
      const matched = classesInTerm.find((klass) => klass.id === filters.classId);
      if (matched) {
        return matched;
      }
    }
    return classesInTerm[0] ?? null;
  }, [classesInTerm, filters.classId]);

  const statuses = useMemo<AttendanceStatus[]>(() => {
    if (filters.statuses && filters.statuses.length > 0) {
      return filters.statuses;
    }
    return STATUS_VALUES;
  }, [filters.statuses]);

  const dateRange = useMemo(() => {
    const start = filters.range?.start ?? selectedTerm?.startDate ?? dayjs().format("YYYY-MM-DD");
    const end = filters.range?.end ?? selectedTerm?.endDate ?? dayjs().format("YYYY-MM-DD");
    const normalizedStart = clampDate(start, selectedTerm?.startDate);
    const normalizedEnd = clampDate(end, selectedTerm?.endDate);
    if (dayjs(normalizedStart).isAfter(dayjs(normalizedEnd))) {
      return {
        start: normalizedEnd,
        end: normalizedStart,
      };
    }
    return {
      start: normalizedStart,
      end: normalizedEnd,
    };
  }, [filters.range?.end, filters.range?.start, selectedTerm]);

  // Transform backend per-student data to frontend format
  const studentSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    if (!serverData?.perStudent) {
      return [];
    }

    return serverData.perStudent
      .map((student) => {
        const counts: Record<AttendanceStatus, number> = {
          H: student.present,
          I: student.excused,
          S: student.sick,
          A: student.absent,
        };
        const total = student.present + student.sick + student.excused + student.absent;
        return {
          studentId: student.studentId,
          studentName: student.studentName,
          nis: "", // NIS not in backend response; could be enriched if needed
          status: "active" as const,
          counts,
          total,
          percentage: student.attendanceRate,
          behaviorNotes: 0, // Behavior notes require separate fetch if needed
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "id-ID"));
  }, [serverData?.perStudent]);

  // For charts, we need weekly data. Since backend doesn't provide weekly breakdown,
  // we fall back to fetching daily attendance records for the class to compute weekly trends.
  // This is a lighter fetch than the original 5000+ records.
  const [weeklyData, setWeeklyData] = useState<{
    weeklyAlpha: WeeklyAlphaPoint[];
    weeklyAttendance: WeeklyAttendancePoint[];
  }>({ weeklyAlpha: [], weeklyAttendance: [] });
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    if (!filters.termId || !filters.classId) {
      setWeeklyData({ weeklyAlpha: [], weeklyAttendance: [] });
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchWeekly = async () => {
      setWeeklyLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("termId", filters.termId);
        params.set("classId", filters.classId);
        if (filters.range?.start) params.set("dateFrom", filters.range.start);
        if (filters.range?.end) params.set("dateTo", filters.range.end);
        params.set("pageSize", "1000"); // Fetch daily records for the class

        const res = await httpClient.get(`/attendance/daily?${params.toString()}`, {
          signal,
        });

        const body = res?.data;
        const data = body && typeof body === "object" && "data" in body ? body.data : body;
        const records = (data?.data ?? data ?? []) as Array<{
          date: string;
          status: AttendanceStatus;
        }>;

        // Compute weekly aggregations
        const alphaMap = new Map<string, number>();
        const attendanceMap = new Map<string, { present: number; total: number }>();

        records.forEach((record) => {
          const week = getWeekStart(record.date);
          if (!attendanceMap.has(week)) {
            attendanceMap.set(week, { present: 0, total: 0 });
          }
          const weekEntry = attendanceMap.get(week)!;
          weekEntry.total += 1;
          if (record.status === "H") {
            weekEntry.present += 1;
          }
          if (record.status === "A") {
            alphaMap.set(week, (alphaMap.get(week) ?? 0) + 1);
          }
        });

        const weeklyAlpha: WeeklyAlphaPoint[] = Array.from(alphaMap.entries())
          .map(([week, alpha]) => ({ week, alpha }))
          .sort((a, b) => (a.week < b.week ? -1 : 1));

        const weeklyAttendance: WeeklyAttendancePoint[] = Array.from(attendanceMap.entries())
          .map(([week, entry]) => ({
            week,
            attendance: toPercent(entry.present, entry.total),
          }))
          .sort((a, b) => (a.week < b.week ? -1 : 1));

        setWeeklyData({ weeklyAlpha, weeklyAttendance });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.warn("Failed to fetch weekly attendance data:", error);
        setWeeklyData({ weeklyAlpha: [], weeklyAttendance: [] });
      } finally {
        setWeeklyLoading(false);
      }
    };

    fetchWeekly();

    return () => controller.abort();
  }, [filters.termId, filters.classId, filters.range?.start, filters.range?.end]);

  const stats = useMemo(() => {
    if (!serverData?.summary) {
      return {
        averageAttendance: 0,
        totalSessions: 0,
        alphaTotal: 0,
        latestAbsenceCount: 0,
        latestAbsenceDate: undefined,
        topStudents: [] as StudentAttendanceSummary[],
      };
    }

    const summary = serverData.summary;
    const totalSessions = summary.present + summary.sick + summary.excused + summary.absent;

    const sortedStudents = [...studentSummaries]
      .filter((s) => s.total > 0)
      .sort((a, b) => {
        if (b.percentage === a.percentage) {
          return a.studentName.localeCompare(b.studentName, "id-ID");
        }
        return b.percentage - a.percentage;
      });

    return {
      averageAttendance: summary.attendanceRate,
      totalSessions,
      alphaTotal: summary.absent,
      latestAbsenceCount: 0, // Would need separate query for this detail
      latestAbsenceDate: undefined,
      topStudents: sortedStudents.slice(0, 3),
    };
  }, [serverData?.summary, studentSummaries]);

  const isLoading =
    serverLoading || weeklyLoading || termsQuery.isLoading || classesQuery.isLoading;

  const isFetching = termsQuery.isFetching || classesQuery.isFetching;

  return {
    terms,
    classes: classesInTerm,
    selectedTerm,
    selectedClass,
    dateRange,
    statuses,
    studentSummaries,
    weeklyAlpha: weeklyData.weeklyAlpha,
    weeklyAttendance: weeklyData.weeklyAttendance,
    stats,
    isLoading,
    isFetching,
  };
};
