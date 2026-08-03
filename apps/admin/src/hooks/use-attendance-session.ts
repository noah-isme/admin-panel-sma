import { useMemo } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import dayjs from "dayjs";
import { resolveActiveTerm } from "../utils/terms";

type AttendanceStatus = "H" | "S" | "I" | "A";

type TermRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
  isActive?: boolean;
  year: string;
  semester: 1 | 2;
};

type ClassRecord = {
  id: string;
  name: string;
  code: string;
  level: number;
  termId: string;
  homeroomId: string;
};

type SubjectRecord = {
  id: string;
  name: string;
};

type TeacherRecord = {
  id: string;
  fullName: string;
};

type ClassSubjectRecord = {
  id: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  termId: string;
};

type ScheduleRecord = {
  id: string;
  classSubjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  slot: number;
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
  gender?: "M" | "F";
};

type AttendanceRecord = {
  id: string;
  enrollmentId: string;
  classId: string;
  subjectId?: string;
  teacherId?: string;
  sessionType?: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  slot?: number;
  recordedAt?: string;
  updatedAt?: string;
};

export type AttendanceSessionFilters = {
  date?: string;
  termId?: string;
  classId?: string;
  subjectId?: string;
  slot?: number;
  teacherId?: string;
};

export type AttendanceSession = {
  scheduleId: string;
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  slot: number;
  startTime: string;
  endTime: string;
  room: string;
};

export type AttendanceStudentRow = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  studentStatus: StudentRecord["status"];
  existing?: AttendanceRecord;
};

const arrayify = <T>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);

const toIsoDate = (value?: string) => {
  if (value && dayjs(value).isValid()) {
    return dayjs(value).format("YYYY-MM-DD");
  }
  return dayjs().format("YYYY-MM-DD");
};

const toIsoWeekday = (value: string) => {
  const day = dayjs(value);
  if (!day.isValid()) {
    const today = dayjs();
    const fallback = today.day();
    return ((fallback + 6) % 7) + 1;
  }
  const jsDay = day.day(); // 0 (Sunday) - 6 (Saturday)
  return ((jsDay + 6) % 7) + 1; // convert to ISO weekday 1-7
};

export const useAttendanceSession = (filters: AttendanceSessionFilters) => {
  const dateIso = toIsoDate(filters.date);
  const weekday = toIsoWeekday(dateIso);

  const termsQuery = useList<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 20 },
    sorters: [{ field: "startDate", order: "asc" }],
    queryOptions: {
      staleTime: 1000 * 60 * 5,
    },
  });

  const classesQuery = useList<ClassRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { keepPreviousData: true },
  });

  const classSubjectsQuery = useList<ClassSubjectRecord>({
    resource: "class-subjects",
    pagination: { current: 1, pageSize: 500 },
    queryOptions: { keepPreviousData: true },
  });

  const subjectsQuery = useList<SubjectRecord>({
    resource: "subjects",
    pagination: { current: 1, pageSize: 200 },
    queryOptions: { staleTime: 1000 * 60 * 10 },
  });

  const teachersQuery = useList<TeacherRecord>({
    resource: "teachers",
    pagination: { current: 1, pageSize: 200 },
    queryOptions: { keepPreviousData: true },
  });

  const schedulesQuery = useList<ScheduleRecord>({
    resource: "schedules",
    pagination: { current: 1, pageSize: 1000 },
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

  const attendanceFilters: CrudFilter[] = [
    { field: "date", operator: "eq", value: dateIso },
    { field: "sessionType", operator: "eq", value: "Mapel" },
  ];

  if (filters.classId) {
    attendanceFilters.push({ field: "classId", operator: "eq", value: filters.classId });
  }
  if (filters.subjectId) {
    attendanceFilters.push({ field: "subjectId", operator: "eq", value: filters.subjectId });
  }
  if (typeof filters.slot === "number") {
    attendanceFilters.push({ field: "slot", operator: "eq", value: filters.slot });
  }

  const attendanceQuery = useList<AttendanceRecord>({
    resource: "attendance",
    filters: attendanceFilters,
    pagination: { current: 1, pageSize: 1000 },
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const terms = arrayify(termsQuery.data?.data);
  const classes = arrayify(classesQuery.data?.data);
  const classSubjects = arrayify(classSubjectsQuery.data?.data);
  const subjects = arrayify(subjectsQuery.data?.data);
  const teachers = arrayify(teachersQuery.data?.data);
  const schedules = arrayify(schedulesQuery.data?.data);
  const enrollments = arrayify(enrollmentsQuery.data?.data);
  const students = arrayify(studentsQuery.data?.data);
  const attendanceRecords = arrayify(attendanceQuery.data?.data);

  const activeTerm = useMemo(() => {
    if (filters.termId) {
      return terms.find((term) => term.id === filters.termId) ?? terms[0] ?? null;
    }
    return resolveActiveTerm(terms);
  }, [filters.termId, terms]);

  const classesInTerm = useMemo(() => {
    if (!activeTerm) {
      return classes;
    }
    return classes.filter((klass) => klass.termId === activeTerm.id);
  }, [activeTerm, classes]);

  const selectedClassId = useMemo(() => {
    if (filters.classId) {
      const exists = classesInTerm.some((klass) => klass.id === filters.classId);
      if (exists) {
        return filters.classId;
      }
    }
    return classesInTerm[0]?.id;
  }, [classesInTerm, filters.classId]);

  const classEnrollments = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }
    return enrollments.filter((enrollment) => enrollment.classId === selectedClassId);
  }, [enrollments, selectedClassId]);

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    students.forEach((student) => map.set(String(student.id), student));
    return map;
  }, [students]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, SubjectRecord>();
    subjects.forEach((subject) => map.set(String(subject.id), subject));
    return map;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, TeacherRecord>();
    teachers.forEach((teacher) => map.set(String(teacher.id), teacher));
    return map;
  }, [teachers]);

  const classSubjectMappings = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }
    return classSubjects.filter((mapping) => mapping.classroomId === selectedClassId);
  }, [classSubjects, selectedClassId]);

  const sessions = useMemo<AttendanceSession[]>(() => {
    if (!selectedClassId) {
      return [];
    }

    return classSubjectMappings.flatMap((mapping) => {
      const subject = subjectMap.get(mapping.subjectId);
      const teacher = teacherMap.get(mapping.teacherId);
      const scheduleForSubject = schedules.filter(
        (schedule) => schedule.classSubjectId === mapping.id
      );

      const filteredByDay = scheduleForSubject.filter((schedule) => schedule.dayOfWeek === weekday);

      const candidates = filteredByDay.length > 0 ? filteredByDay : scheduleForSubject;

      return candidates.map<AttendanceSession>((schedule) => ({
        scheduleId: schedule.id,
        classSubjectId: mapping.id,
        subjectId: mapping.subjectId,
        subjectName: subject?.name ?? "Mapel",
        teacherId: mapping.teacherId,
        teacherName: teacher?.fullName ?? "Guru",
        slot: schedule.slot,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        room: schedule.room,
      }));
    });
  }, [classSubjectMappings, schedules, subjectMap, teacherMap, weekday, selectedClassId]);

  const activeSession = useMemo<AttendanceSession | null>(() => {
    if (sessions.length === 0) {
      return null;
    }

    const bySubjectAndSlot =
      sessions.find(
        (session) => session.subjectId === filters.subjectId && session.slot === filters.slot
      ) ?? null;
    if (bySubjectAndSlot) {
      return bySubjectAndSlot;
    }

    if (filters.subjectId) {
      const bySubject = sessions.find((session) => session.subjectId === filters.subjectId);
      if (bySubject) {
        return bySubject;
      }
    }

    if (typeof filters.slot === "number") {
      const bySlot = sessions.find((session) => session.slot === filters.slot);
      if (bySlot) {
        return bySlot;
      }
    }

    if (filters.teacherId) {
      const byTeacher = sessions.find((session) => session.teacherId === filters.teacherId);
      if (byTeacher) {
        return byTeacher;
      }
    }

    return sessions[0] ?? null;
  }, [filters.slot, filters.subjectId, filters.teacherId, sessions]);

  const filteredAttendanceRecords = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }

    return attendanceRecords.filter((record) => {
      if (record.classId !== selectedClassId) return false;
      if (record.sessionType && record.sessionType !== "Mapel") return false;
      if (record.date !== dateIso) return false;
      if (activeSession?.subjectId && record.subjectId !== activeSession.subjectId) return false;
      if (typeof activeSession?.slot === "number" && typeof record.slot === "number") {
        if (record.slot !== activeSession.slot) return false;
      }
      if (activeSession?.teacherId && record.teacherId) {
        if (record.teacherId !== activeSession.teacherId) return false;
      }
      return true;
    });
  }, [activeSession, attendanceRecords, dateIso, selectedClassId]);

  const attendanceByEnrollment = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    filteredAttendanceRecords.forEach((record) => map.set(String(record.enrollmentId), record));
    return map;
  }, [filteredAttendanceRecords]);

  const rows = useMemo<AttendanceStudentRow[]>(() => {
    if (!selectedClassId) {
      return [];
    }

    return classEnrollments
      .map((enrollment) => {
        const student = studentMap.get(String(enrollment.studentId));
        if (!student) {
          return null;
        }
        return {
          enrollmentId: String(enrollment.id),
          studentId: String(student.id),
          studentName: student.fullName ?? `Siswa ${student.id}`,
          studentNis: student.nis ?? "-",
          studentStatus: student.status,
          existing: attendanceByEnrollment.get(String(enrollment.id)),
        };
      })
      .filter((row): row is AttendanceStudentRow => row !== null);
  }, [attendanceByEnrollment, classEnrollments, selectedClassId, studentMap]);

  const isLoading =
    termsQuery.isLoading ||
    classesQuery.isLoading ||
    classSubjectsQuery.isLoading ||
    subjectsQuery.isLoading ||
    teachersQuery.isLoading ||
    schedulesQuery.isLoading ||
    enrollmentsQuery.isLoading ||
    studentsQuery.isLoading ||
    attendanceQuery.isLoading;

  const isFetching =
    termsQuery.isFetching ||
    classesQuery.isFetching ||
    classSubjectsQuery.isFetching ||
    subjectsQuery.isFetching ||
    teachersQuery.isFetching ||
    schedulesQuery.isFetching ||
    enrollmentsQuery.isFetching ||
    studentsQuery.isFetching ||
    attendanceQuery.isFetching;

  return {
    date: dateIso,
    weekday,
    terms,
    classes: classesInTerm,
    sessions,
    activeTerm,
    activeSession,
    selectedClassId,
    rows,
    attendanceByEnrollment,
    attendanceRecords: filteredAttendanceRecords,
    queries: {
      termsQuery,
      classesQuery,
      classSubjectsQuery,
      subjectsQuery,
      teachersQuery,
      schedulesQuery,
      enrollmentsQuery,
      studentsQuery,
      attendanceQuery,
    },
    meta: {
      totalStudents: classEnrollments.length,
      totalActiveStudents: rows.filter((row) => row.studentStatus === "active").length,
    },
    helpers: {
      subjectMap,
      teacherMap,
    },
    isLoading,
    isFetching,
  };
};

export type {
  ClassRecord as AttendanceClassRecord,
  ClassSubjectRecord as AttendanceClassSubjectRecord,
  ScheduleRecord as AttendanceScheduleRecord,
  SubjectRecord as AttendanceSubjectRecord,
  TeacherRecord as AttendanceTeacherRecord,
  AttendanceRecord as AttendanceEntryRecord,
};
