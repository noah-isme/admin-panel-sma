export type CalendarCategory =
  | "EFFECTIVE_DAY"
  | "HOLIDAY"
  | "EXAM"
  | "SCHOOL_ACTIVITY"
  | "MEETING"
  | "EXTRACURRICULAR"
  | "INACTIVE_DAY";

export type CalendarEventSource = "CALENDAR" | "EXAM" | "ANNOUNCEMENT";

export type CalendarCategoryMeta = {
  label: string;
  color: string;
  icon: string;
  textColor?: string;
  description?: string;
};

export const CALENDAR_CATEGORY_META: Record<CalendarCategory, CalendarCategoryMeta> = {
  EFFECTIVE_DAY: {
    label: "Hari Efektif",
    color: "#2563eb",
    icon: "🟦",
    textColor: "#ffffff",
    description: "Hari belajar efektif sesuai kalender akademik.",
  },
  HOLIDAY: {
    label: "Libur Nasional",
    color: "#dc2626",
    icon: "🟥",
    textColor: "#ffffff",
    description: "Libur yang ditetapkan pemerintah atau sekolah.",
  },
  EXAM: {
    label: "Ujian",
    color: "#facc15",
    icon: "🟨",
    textColor: "#854d0e",
    description: "Penilaian tengah/akhir semester, try out, atau praktik.",
  },
  SCHOOL_ACTIVITY: {
    label: "Kegiatan Sekolah",
    color: "#16a34a",
    icon: "🟩",
    textColor: "#ffffff",
    description: "Agenda resmi sekolah seperti MPLS, upacara, dan studi tour.",
  },
  MEETING: {
    label: "Rapat / Pelatihan",
    color: "#8b5cf6",
    icon: "🟪",
    textColor: "#ffffff",
    description: "Rapat koordinasi, workshop, dan pelatihan guru.",
  },
  EXTRACURRICULAR: {
    label: "Ekstrakurikuler",
    color: "#d1d5db",
    icon: "⚪",
    textColor: "#1f2937",
    description: "Agenda OSIS, lomba, dan kegiatan minat bakat.",
  },
  INACTIVE_DAY: {
    label: "Hari Tidak Efektif",
    color: "#475569",
    icon: "⚫",
    textColor: "#ffffff",
    description: "Hari tanpa KBM karena maintenance atau kegiatan eksternal.",
  },
};

export const resolveCalendarCategoryMeta = (
  category: CalendarCategory | string | null | undefined
): CalendarCategoryMeta =>
  (category != null && CALENDAR_CATEGORY_META[category as CalendarCategory]) || {
    label: category ?? "Lainnya",
    color: "#64748b",
    icon: "⚪",
    textColor: "#ffffff",
  };

export const CALENDAR_CATEGORY_ORDER: CalendarCategory[] = [
  "EFFECTIVE_DAY",
  "HOLIDAY",
  "EXAM",
  "SCHOOL_ACTIVITY",
  "MEETING",
  "EXTRACURRICULAR",
  "INACTIVE_DAY",
];

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  category: CalendarCategory;
  categoryLabel: string;
  color: string;
  icon: string;
  textColor?: string;
  start: string;
  end: string;
  allDay: boolean;
  organizer?: string;
  location?: string;
  audience?: string;
  tags: string[];
  relatedClassIds: string[];
  source: CalendarEventSource;
  sourceLabel: string;
  termId?: string;
  meta?: Record<string, unknown>;
};

export type CalendarLegendItem = CalendarCategoryMeta & {
  key: CalendarCategory;
};

export const CALENDAR_LEGEND: CalendarLegendItem[] = CALENDAR_CATEGORY_ORDER.map((key) => ({
  key,
  ...CALENDAR_CATEGORY_META[key],
}));

export const CALENDAR_SOURCE_LABEL: Record<CalendarEventSource, string> = {
  CALENDAR: "Kalender Akademik",
  EXAM: "Jadwal Ujian",
  ANNOUNCEMENT: "Pengumuman",
};
