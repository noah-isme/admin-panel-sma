export type StudentStatusCode = "active" | "inactive" | "alumni" | "graduated";

export type StudentGenderCode = "M" | "F";

export interface StudentRosterRow {
  id: string;
  nis: string;
  fullName: string;
  preferredName?: string | null;
  gender: StudentGenderCode;
  birthDate: string;
  birthPlace?: string | null;
  classId: string;
  className: string;
  classLevel: number;
  classTrack: string;
  homeroomId?: string | null;
  homeroomName?: string | null;
  status: StudentStatusCode;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  emergencyPhone?: string | null;
  address?: string | null;
  lastUpdated: string;
  createdAt: string;
}

export interface StudentRosterSummary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  alumniStudents: number;
  genderBreakdown: Array<{ gender: StudentGenderCode; count: number; label: string }>;
  classDistribution: Array<{ classId: string; className: string; count: number }>;
  statusBreakdown: Array<{ status: StudentStatusCode; label: string; count: number }>;
  activeRate: number;
}

export interface StudentRosterFilters {
  classes: Array<{ id: string; label: string; level: number; track: string }>;
  statuses: Array<{ value: StudentStatusCode | "all"; label: string }>;
  genders: Array<{ value: StudentGenderCode | "all"; label: string }>;
  guardians: Array<{ value: string; label: string }>;
  birthYears: Array<{ value: number; label: string }>;
  tracks: Array<{ value: string; label: string }>;
}

export interface StudentRosterPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type StudentRosterSortField = "fullName" | "className" | "status" | "nis" | "lastUpdated";

export interface StudentRosterAppliedFilters {
  classId?: string;
  status?: StudentStatusCode;
  gender?: StudentGenderCode;
  guardian?: string;
  birthYearStart?: number;
  birthYearEnd?: number;
  track?: string;
  search?: string;
  sortField?: StudentRosterSortField;
  sortOrder?: "ascend" | "descend";
  page: number;
  perPage: number;
}

export interface StudentRosterResponse {
  summary: StudentRosterSummary;
  filters: StudentRosterFilters;
  rows: StudentRosterRow[];
  pagination: StudentRosterPagination;
  appliedFilters: StudentRosterAppliedFilters;
}
