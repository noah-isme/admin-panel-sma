export type TeacherStatusCode = "active" | "inactive" | "on_leave";

export type TeacherAvailabilityLevel = "HIGH" | "MEDIUM" | "LOW";

export type TeacherRosterSortField =
  | "fullName"
  | "mainSubjectName"
  | "status"
  | "assignmentCount"
  | "availability"
  | "lastUpdated";

export interface TeacherRosterRow {
  id: string;
  fullName: string;
  nip: string;
  email: string;
  phone: string;
  status: TeacherStatusCode;
  mainSubjectId?: string | null;
  mainSubjectName?: string;
  subjectGroup?: string;
  tracks: string[];
  homeroomClassId?: string | null;
  homeroomClassName?: string | null;
  assignmentCount: number;
  availability: TeacherAvailabilityLevel | null;
  lastUpdated: string;
  createdAt: string;
}

export interface TeacherRosterSummary {
  totalTeachers: number;
  activeTeachers: number;
  inactiveTeachers: number;
  homeroomTeachers: number;
  activeRate: number;
  subjectDistribution: Array<{ subjectId: string; subjectName: string; count: number }>;
  trackDistribution: Array<{ track: string; count: number }>;
  availabilityBreakdown: Array<{ level: TeacherAvailabilityLevel; count: number }>;
}

export interface TeacherRosterFilters {
  subjects: Array<{ id: string; label: string; group?: string }>;
  statuses: Array<{ value: TeacherStatusCode | "all"; label: string }>;
  tracks: Array<{ value: string; label: string }>;
  availabilities: Array<{ value: TeacherAvailabilityLevel | "all"; label: string }>;
  homerooms: Array<{ id: string; label: string }>;
}

export interface TeacherRosterPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface TeacherRosterAppliedFilters {
  subjectId?: string;
  status?: TeacherStatusCode;
  track?: string;
  availability?: TeacherAvailabilityLevel;
  homeroomClassId?: string;
  search?: string;
  sortField?: TeacherRosterSortField;
  sortOrder?: "ascend" | "descend";
  page: number;
  perPage: number;
}

export interface TeacherRosterResponse {
  summary: TeacherRosterSummary;
  filters: TeacherRosterFilters;
  rows: TeacherRosterRow[];
  pagination: TeacherRosterPagination;
  appliedFilters: TeacherRosterAppliedFilters;
}
