export type GradeStatusCode = "PASS" | "REMEDIAL" | "FAIL";

export type GradeStatusTone = "success" | "warning" | "danger";

export interface GradeStatusMeta {
  code: GradeStatusCode;
  label: string;
  description: string;
  tone: GradeStatusTone;
  icon: "check" | "alert" | "x";
}

export interface GradeReportRow {
  id: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  componentId: string;
  componentName: string;
  componentCategory: string;
  componentWeight: number;
  componentDescription?: string;
  score: number;
  kkm: number;
  status: GradeStatusMeta;
  teacherId: string;
  teacherName: string;
  recordedAt: string;
  lastUpdated: string;
  termId: string;
  termName: string;
  termLabel: string;
}

export interface GradeReportSummary {
  averageScore: number | null;
  highestScore?: {
    score: number;
    studentId: string;
    studentName: string;
    componentName: string;
    componentCategory: string;
  };
  lowestScore?: {
    score: number;
    studentId: string;
    studentName: string;
    componentName: string;
  };
  belowKkmCount: number;
  componentCount: number;
  remedialCount: number;
  statusBreakdown: Array<{ code: GradeStatusCode; label: string; count: number }>;
  distribution: Array<{ bucket: string; from: number; to: number; count: number }>;
}

export interface GradeFilterOption<TExtras = Record<string, unknown>> {
  id: string;
  label: string;
  extras?: TExtras;
}

export interface GradeReportFilters {
  terms: GradeFilterOption<{ year: string; semester: number; active: boolean }>[];
  classes: GradeFilterOption<{ level: number; track: string }>[];
  subjects: GradeFilterOption<{ code: string }>[];
  components: GradeFilterOption<{ subjectId: string; classId: string }>[];
  teachers: GradeFilterOption[];
  statuses: Array<{ value: GradeStatusCode | "ALL"; label: string }>;
}

export interface GradeReportContext {
  termId?: string | null;
  termName?: string | null;
  termLabel?: string | null;
  classId?: string | null;
  className?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
}

export interface GradeReportPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface GradeReportResponse {
  context: GradeReportContext;
  summary: GradeReportSummary;
  filters: GradeReportFilters;
  rows: GradeReportRow[];
  pagination: GradeReportPagination;
  appliedFilters: Record<string, unknown>;
}
