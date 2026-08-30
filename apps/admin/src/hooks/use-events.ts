import { useList } from "./use-refine-list";
import { useCallback, useMemo } from "react";
import { type CrudFilter } from "@refinedev/core";
import dayjs from "dayjs";
import {
  CALENDAR_CATEGORY_META,
  CALENDAR_SOURCE_LABEL,
  resolveCalendarCategoryMeta,
  type CalendarCategory,
  type CalendarEvent,
} from "../types/calendar";

type CalendarEventRecord = {
  id: string;
  title: string;
  description?: string;
  category: CalendarCategory;
  startDate: string;
  endDate: string;
  termId?: string;
  organizer?: string;
  location?: string;
  audience?: string;
  relatedClassIds?: string[];
  tags?: string[];
  allDay?: boolean;
  source?: string;
};

type ExamEventScope = "SCHOOL" | "GRADE" | "CLASS";
type ExamEventType = "PTS" | "PAS" | "TRYOUT" | "PRAKTEK";

type ExamEventRecord = {
  id: string;
  name: string;
  description?: string;
  termId?: string;
  startDate: string;
  endDate: string;
  scope: ExamEventScope;
  examType: ExamEventType;
  relatedClassIds?: string[];
  organizer?: string;
  publishedAt?: string;
  tags?: string[];
};

type AnnouncementAudience = "ALL" | "GURU" | "SISWA" | `CLASS:${string}`;

type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  publishAt?: string;
  publishedAt?: string;
  audience?: AnnouncementAudience;
  authorId?: string;
};

export type UseEventsFilters = {
  termId?: string;
  categories?: CalendarCategory[];
  search?: string;
  range?: { start: string; end: string };
};

const DEFAULT_SEARCH_FIELDS: Array<keyof CalendarEvent> = [
  "title",
  "description",
  "organizer",
  "location",
  "audience",
];

const normalizeISO = (value: string): string => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  return parsed.toISOString();
};

const hasTimeComponent = (value: string) => value.includes("T");

const intersectsRange = (
  eventStart: dayjs.Dayjs,
  eventEnd: dayjs.Dayjs,
  range?: { start: string; end: string }
) => {
  if (!range) {
    return true;
  }

  const start = dayjs(range.start);
  const end = dayjs(range.end);

  if (!start.isValid() && !end.isValid()) {
    return true;
  }

  if (start.isValid() && end.isValid()) {
    if (eventEnd.isBefore(start, "minute")) {
      return false;
    }
    if (eventStart.isAfter(end, "minute")) {
      return false;
    }
    return true;
  }

  if (start.isValid()) {
    return !eventEnd.isBefore(start, "minute");
  }

  if (end.isValid()) {
    return !eventStart.isAfter(end, "minute");
  }

  return true;
};

const mapCalendarRecord = (record: CalendarEventRecord): CalendarEvent => {
  const categoryMeta = resolveCalendarCategoryMeta(record.category);
  const start = normalizeISO(record.startDate);
  const end = normalizeISO(record.endDate ?? record.startDate);

  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean) : [];
  const relatedClassIds = Array.isArray(record.relatedClassIds)
    ? record.relatedClassIds.filter(Boolean)
    : [];

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    categoryLabel: categoryMeta.label,
    color: categoryMeta.color,
    icon: categoryMeta.icon,
    textColor: categoryMeta.textColor,
    start,
    end,
    allDay:
      typeof record.allDay === "boolean" ? record.allDay : !hasTimeComponent(record.startDate),
    organizer: record.organizer,
    location: record.location,
    audience: record.audience,
    tags,
    relatedClassIds,
    source: "CALENDAR",
    sourceLabel: CALENDAR_SOURCE_LABEL.CALENDAR,
    termId: record.termId,
    meta: { original: record },
  };
};

const mapExamRecord = (record: ExamEventRecord): CalendarEvent => {
  const categoryMeta = CALENDAR_CATEGORY_META.EXAM;
  const start = normalizeISO(record.startDate);
  const end = normalizeISO(record.endDate ?? record.startDate);
  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean) : [];
  const relatedClassIds = Array.isArray(record.relatedClassIds)
    ? record.relatedClassIds.filter(Boolean)
    : [];

  const description =
    record.description ?? `Jadwal ${record.examType} untuk cakupan ${record.scope.toLowerCase()}.`;

  return {
    id: record.id,
    title: record.name,
    description,
    category: "EXAM",
    categoryLabel: categoryMeta.label,
    color: categoryMeta.color,
    icon: categoryMeta.icon,
    textColor: categoryMeta.textColor,
    start,
    end,
    allDay: true,
    organizer: record.organizer ?? "Panitia Ujian",
    audience: record.scope,
    tags: [...tags, record.examType],
    relatedClassIds,
    source: "EXAM",
    sourceLabel: CALENDAR_SOURCE_LABEL.EXAM,
    termId: record.termId,
    meta: {
      original: record,
      scope: record.scope,
      examType: record.examType,
      publishedAt: record.publishedAt,
    },
  };
};

const mapAnnouncementRecord = (record: AnnouncementRecord): CalendarEvent => {
  const categoryMeta = CALENDAR_CATEGORY_META.SCHOOL_ACTIVITY;
  const rawStart = record.publishAt ?? record.publishedAt ?? new Date().toISOString();
  const start = normalizeISO(rawStart);

  return {
    id: record.id,
    title: record.title,
    description: record.body,
    category: "SCHOOL_ACTIVITY",
    categoryLabel: categoryMeta.label,
    color: categoryMeta.color,
    icon: "📢",
    textColor: categoryMeta.textColor,
    start,
    end: start,
    allDay: true,
    organizer: record.authorId ? `Oleh ${record.authorId}` : "Pengumuman Sekolah",
    audience: record.audience,
    tags: ["Pengumuman"],
    relatedClassIds: [],
    source: "ANNOUNCEMENT",
    sourceLabel: CALENDAR_SOURCE_LABEL.ANNOUNCEMENT,
    termId: undefined,
    meta: { original: record },
  };
};

export const useEvents = (filters: UseEventsFilters = {}) => {
  const termFilter: CrudFilter[] | undefined = filters.termId
    ? [
        {
          field: "termId",
          operator: "eq",
          value: filters.termId,
        },
      ]
    : undefined;

  const calendarQuery = useList<CalendarEventRecord>({
    resource: "calendar-events",
    filters: termFilter,
    pagination: {
      current: 1,
      pageSize: 100,
    },
    sorters: [{ field: "startDate", order: "asc" }],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const examQuery = useList<ExamEventRecord>({
    resource: "exam-events",
    filters: termFilter,
    pagination: {
      current: 1,
      pageSize: 100,
    },
    sorters: [{ field: "startDate", order: "asc" }],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const announcementQuery = useList<AnnouncementRecord>({
    resource: "announcements",
    pagination: {
      current: 1,
      pageSize: 100,
    },
    sorters: [{ field: "publishAt", order: "asc" }],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const combinedEvents = useMemo(() => {
    const manualEvents = (calendarQuery.data?.data ?? []).map(mapCalendarRecord);
    const examEvents = (examQuery.data?.data ?? []).map(mapExamRecord);
    const announcementEvents = (announcementQuery.data?.data ?? []).map(mapAnnouncementRecord);

    return [...manualEvents, ...examEvents, ...announcementEvents].sort((a, b) =>
      dayjs(a.start).diff(dayjs(b.start))
    );
  }, [announcementQuery.data?.data, calendarQuery.data?.data, examQuery.data?.data]);

  const filteredEvents = useMemo(() => {
    const categorySet =
      filters.categories && filters.categories.length > 0
        ? new Set<CalendarCategory>(filters.categories)
        : null;

    const searchTerm = filters.search?.trim().toLowerCase() ?? "";
    const hasSearch = searchTerm.length > 0;

    return combinedEvents.filter((event) => {
      if (categorySet && !categorySet.has(event.category)) {
        return false;
      }

      const eventStart = dayjs(event.start);
      const eventEnd = dayjs(event.end ?? event.start);

      if (!eventStart.isValid()) {
        return false;
      }

      if (!intersectsRange(eventStart, eventEnd.isValid() ? eventEnd : eventStart, filters.range)) {
        return false;
      }

      if (!hasSearch) {
        return true;
      }

      const fieldMatch = DEFAULT_SEARCH_FIELDS.some((field) => {
        const value = event[field];
        if (!value) {
          return false;
        }
        return String(value).toLowerCase().includes(searchTerm);
      });

      if (fieldMatch) {
        return true;
      }

      const tagMatch = event.tags?.some((tag) => tag.toLowerCase().includes(searchTerm));
      return tagMatch;
    });
  }, [combinedEvents, filters.categories, filters.range, filters.search]);

  const refetch = useCallback(async () => {
    await Promise.all([calendarQuery.refetch(), examQuery.refetch(), announcementQuery.refetch()]);
  }, [announcementQuery, calendarQuery, examQuery]);

  return {
    events: combinedEvents,
    filteredEvents,
    isLoading: calendarQuery.isLoading || examQuery.isLoading || announcementQuery.isLoading,
    isFetching: calendarQuery.isFetching || examQuery.isFetching || announcementQuery.isFetching,
    error: calendarQuery.error ?? examQuery.error ?? announcementQuery.error ?? null,
    refetch,
    queries: {
      calendarQuery,
      examQuery,
      announcementQuery,
    },
  };
};
