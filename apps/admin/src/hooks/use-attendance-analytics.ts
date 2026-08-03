import { useMemo } from "react";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
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

type EnrollmentRecord = {
  id: string;
  studentId: string;
  classId: string;
};

type StudentRecord = {
  id: string;
  fullName: string;
  nis: string;
  status: "active" | "inactive";
};

type AttendanceRecord = {
  id: string;
  enrollmentId: string;
  classId: string;
  status: AttendanceStatus;
  date: string;
  sessionType?: string;
};

type BehaviorNoteRecord = {
  id: string;
  studentId: string;
  classroomId: string;
  date: string;
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
  status: StudentRecord["status"];
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

export const useAttendanceAnalytics = (
  filters: AttendanceAnalyticsFilters = {}
): AttendanceAnalyticsResult => {
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

  const enrollmentsQuery = useList<EnrollmentRecord>({
    resource: "enrollments",
    pagination: { current: 1, pageSize: 1000 },
    queryOptions: { keepPreviousData: true },
  });

  const studentsQuery = useList<StudentRecord>({
    resource: "students",
    pagination: { current: 1, pageSize: 1000 },
    queryOptions: { keepPreviousData: true },
  });

  const attendanceQuery = useList<AttendanceRecord>({
    resource: "attendance",
    pagination: { current: 1, pageSize: 2000 },
    queryOptions: { keepPreviousData: true },
  });

  const behaviorNotesQuery = useList<BehaviorNoteRecord>({
    resource: "behavior-notes",
    pagination: { current: 1, pageSize: 1000 },
    queryOptions: { keepPreviousData: true },
  });

  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data?.data]);
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data?.data]);
  const enrollments = useMemo(
    () => enrollmentsQuery.data?.data ?? [],
    [enrollmentsQuery.data?.data]
  );
  const students = useMemo(() => studentsQuery.data?.data ?? [], [studentsQuery.data?.data]);
  const attendanceRecords = useMemo(
    () => attendanceQuery.data?.data ?? [],
    [attendanceQuery.data?.data]
  );
  const behaviorNotes = useMemo(
    () => behaviorNotesQuery.data?.data ?? [],
    [behaviorNotesQuery.data?.data]
  );

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
    const start =
      filters.range?.start ??
      selectedTerm?.startDate ??
      attendanceRecords[0]?.date ??
      dayjs().format("YYYY-MM-DD");
    const end =
      filters.range?.end ??
      selectedTerm?.endDate ??
      attendanceRecords[attendanceRecords.length - 1]?.date ??
      dayjs().format("YYYY-MM-DD");
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
  }, [attendanceRecords, filters.range?.end, filters.range?.start, selectedTerm]);

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    students.forEach((student) => {
      map.set(String(student.id), student);
    });
    return map;
  }, [students]);

  const enrollmentsForClass = useMemo(() => {
    if (!selectedClass) {
      return [];
    }
    return enrollments.filter((enrollment) => enrollment.classId === selectedClass.id);
  }, [enrollments, selectedClass]);

  const behaviorNotesByStudent = useMemo(() => {
    if (!selectedClass) {
      return new Map<string, number>();
    }
    const map = new Map<string, number>();
    behaviorNotes
      .filter((note) => note.classroomId === selectedClass.id)
      .forEach((note) => {
        const count = map.get(String(note.studentId)) ?? 0;
        map.set(String(note.studentId), count + 1);
      });
    return map;
  }, [behaviorNotes, selectedClass]);

  const filteredAttendance = useMemo(() => {
    if (!selectedClass) {
      return [];
    }
    const start = dayjs(dateRange.start);
    const end = dayjs(dateRange.end).endOf("day");
    return attendanceRecords.filter((record) => {
      if (record.classId !== selectedClass.id) {
        return false;
      }
      if (record.sessionType && record.sessionType !== "Harian") {
        return false;
      }
      if (!statuses.includes(record.status)) {
        return false;
      }
      const recordDate = dayjs(record.date);
      if (!recordDate.isValid()) {
        return false;
      }
      return (
        (recordDate.isAfter(start) || recordDate.isSame(start, "day")) &&
        (recordDate.isBefore(end) || recordDate.isSame(end, "day"))
      );
    });
  }, [attendanceRecords, dateRange.end, dateRange.start, selectedClass, statuses]);

  const studentSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    const summaryMap = new Map<string, StudentAttendanceSummary>();

    enrollmentsForClass.forEach((enrollment) => {
      const student = studentMap.get(String(enrollment.studentId));
      if (!student) return;
      summaryMap.set(String(enrollment.id), {
        studentId: String(student.id),
        studentName: student.fullName ?? `Siswa ${student.id}`,
        nis: student.nis ?? "-",
        status: student.status,
        counts: { H: 0, I: 0, S: 0, A: 0 },
        total: 0,
        percentage: 0,
        behaviorNotes: behaviorNotesByStudent.get(String(student.id)) ?? 0,
      });
    });

    filteredAttendance.forEach((record) => {
      const summary = summaryMap.get(String(record.enrollmentId));
      if (!summary) {
        return;
      }
      summary.counts[record.status] += 1;
      summary.total += 1;
    });

    summaryMap.forEach((summary) => {
      summary.percentage = toPercent(summary.counts.H, summary.total);
    });

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, "id-ID")
    );
  }, [behaviorNotesByStudent, enrollmentsForClass, filteredAttendance, studentMap]);

  const weeklyAggregations = useMemo(() => {
    const alphaMap = new Map<string, number>();
    const attendanceMap = new Map<string, { present: number; total: number }>();

    filteredAttendance.forEach((record) => {
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
      .map(([week, alpha]) => ({
        week,
        alpha,
      }))
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    const weeklyAttendance: WeeklyAttendancePoint[] = Array.from(attendanceMap.entries())
      .map(([week, entry]) => ({
        week,
        attendance: toPercent(entry.present, entry.total),
      }))
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    return { weeklyAlpha, weeklyAttendance };
  }, [filteredAttendance]);

  const stats = useMemo(() => {
    const totals = filteredAttendance.reduce(
      (acc, record) => {
        acc.total += 1;
        if (record.status === "H") {
          acc.present += 1;
        }
        if (record.status === "A") {
          acc.alpha += 1;
          const dateKey = record.date;
          acc.alphaByDate.set(dateKey, (acc.alphaByDate.get(dateKey) ?? 0) + 1);
        }
        return acc;
      },
      {
        present: 0,
        total: 0,
        alpha: 0,
        alphaByDate: new Map<string, number>(),
      }
    );

    let latestAbsenceDate: string | undefined;
    let latestAbsenceCount = 0;
    if (totals.alphaByDate.size > 0) {
      const sortedDates = Array.from(totals.alphaByDate.entries()).sort((a, b) =>
        a[0] > b[0] ? -1 : 1
      );
      const [date, count] = sortedDates[0];
      latestAbsenceDate = date;
      latestAbsenceCount = count;
    }

    const sortedStudents = [...studentSummaries]
      .filter((summary) => summary.total > 0)
      .sort((a, b) => {
        if (b.percentage === a.percentage) {
          return a.studentName.localeCompare(b.studentName, "id-ID");
        }
        return b.percentage - a.percentage;
      });

    return {
      averageAttendance: toPercent(totals.present, totals.total),
      totalSessions: totals.total,
      alphaTotal: totals.alpha,
      latestAbsenceCount,
      latestAbsenceDate,
      topStudents: sortedStudents.slice(0, 3),
    };
  }, [filteredAttendance, studentSummaries]);

  const isLoading =
    termsQuery.isLoading ||
    classesQuery.isLoading ||
    enrollmentsQuery.isLoading ||
    studentsQuery.isLoading ||
    attendanceQuery.isLoading ||
    behaviorNotesQuery.isLoading;

  const isFetching =
    termsQuery.isFetching ||
    classesQuery.isFetching ||
    enrollmentsQuery.isFetching ||
    studentsQuery.isFetching ||
    attendanceQuery.isFetching ||
    behaviorNotesQuery.isFetching;

  return {
    terms,
    classes: classesInTerm,
    selectedTerm,
    selectedClass,
    dateRange,
    statuses,
    studentSummaries,
    weeklyAlpha: weeklyAggregations.weeklyAlpha,
    weeklyAttendance: weeklyAggregations.weeklyAttendance,
    stats,
    isLoading,
    isFetching,
  };
};
