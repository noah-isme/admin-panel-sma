// Portal-specific types for Parent/Student portal API
// These extend the core domain types with portal-specific fields and relationships

export type PortalRole = "PARENT" | "STUDENT";

export type ParentStudentRelationship = "PARENT" | "GUARDIAN" | "EMERGENCY_CONTACT";

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  relationship: ParentStudentRelationship;
  canViewGrades: boolean;
  canViewAttendance: boolean;
  canViewBehavior: boolean;
  canViewAnnouncements: boolean;
  canReceiveNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalPreferences {
  userId: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  gradeAlerts: boolean;
  attendanceAlerts: boolean;
  behaviorAlerts: boolean;
  announcementAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
  appVersion?: string;
  lastUsedAt: string;
  createdAt: string;
}

// Student summary for parent views
export interface StudentSummary {
  id: string;
  nis: string;
  fullName: string;
  birthDate: string;
  gender: "M" | "F";
  className?: string;
  currentTerm?: string;
  currentClassId?: string;
}

// Portal user info returned after login
export interface PortalUserInfo {
  id: string;
  email: string;
  fullName: string;
  role: PortalRole;
  portalRole: PortalRole;
  studentId?: string;
  linkedStudents?: StudentSummary[];
}

// Portal profile with full details
export interface PortalProfile {
  user: PortalUserInfo;
  preferences: PortalPreferences;
  deviceTokens: DeviceToken[];
}

// Grade response for portal
export interface PortalGrade {
  studentId: string;
  enrollmentId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  componentGrades: Record<string, number>;
  finalGrade: number;
  letterGrade: string;
  isPassed: boolean;
  teacherName?: string;
}

export interface PortalGradesResponse {
  termId: string;
  grades: PortalGrade[];
  summary?: {
    gpa: number;
    totalSubjects: number;
    passedSubjects: number;
    failedSubjects: number;
  };
}

// Attendance response for portal
export interface PortalDailyAttendance {
  id: string;
  date: string;
  status: "H" | "S" | "I" | "A";
  notes?: string;
}

export interface PortalSubjectAttendance {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  status: "H" | "S" | "I" | "A";
  notes?: string;
}

export interface PortalAttendanceSummary {
  totalDays: number;
  present: number;
  sick: number;
  permission: number;
  absent: number;
  percentage: number;
}

export interface PortalAttendanceResponse {
  studentId: string;
  termId: string;
  daily: PortalDailyAttendance[];
  subject: PortalSubjectAttendance[];
  summary: PortalAttendanceSummary;
}

// Announcement response for portal
export interface PortalAnnouncement {
  id: string;
  title: string;
  content: string;
  audience: "ALL" | "GURU" | "SISWA" | "CLASS" | "PARENT";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isPinned: boolean;
  publishedAt?: string;
  expiresAt?: string;
  publisherName?: string;
}

export interface PortalAnnouncementsResponse {
  data: PortalAnnouncement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Behavior notes response for portal
export interface PortalBehaviorNote {
  id: string;
  category: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  title: string;
  description: string;
  date: string;
  points: number;
  reporterName?: string;
}

export interface PortalBehaviorSummary {
  totalNotes: number;
  positiveNotes: number;
  negativeNotes: number;
  neutralNotes: number;
  totalPoints: number;
}

export interface PortalBehaviorResponse {
  studentId: string;
  termId: string;
  notes: PortalBehaviorNote[];
  summary: PortalBehaviorSummary;
}

// Calendar event response for portal
export interface PortalCalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: "EXAM" | "HOLIDAY" | "MEETING" | "ACTIVITY" | "OTHER";
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  audience: "ALL" | "GURU" | "SISWA" | "CLASS" | "PARENT";
  className?: string;
}

export interface PortalCalendarResponse {
  events: PortalCalendarEvent[];
}

// Request/Response types for mutations
export interface PortalLoginRequest {
  email: string;
  password: string;
}

export interface PortalLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: PortalUserInfo;
}

export interface UpdatePortalPreferencesRequest {
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  gradeAlerts?: boolean;
  attendanceAlerts?: boolean;
  behaviorAlerts?: boolean;
  announcementAlerts?: boolean;
}

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
  appVersion?: string;
}

// Query parameters
export interface PortalGradesQuery {
  termId?: string;
  subjectId?: string;
  classId?: string;
  studentId?: string; // For parents
}

export interface PortalAttendanceQuery {
  termId?: string;
  startDate?: string;
  endDate?: string;
  type?: "daily" | "subject";
  studentId?: string; // For parents
}

export interface PortalAnnouncementsQuery {
  page?: number;
  limit?: number;
  active?: boolean;
  studentId?: string; // For parents
}

export interface PortalBehaviorQuery {
  termId?: string;
  category?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  studentId?: string; // For parents
}

export interface PortalCalendarQuery {
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM
  studentId?: string; // For parents
}
