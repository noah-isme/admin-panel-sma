import React, { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Button,
  Card,
  Calendar as AntdCalendar,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Segmented,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import idLocale from "antd/es/calendar/locale/id_ID";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  PlusOutlined,
  PrinterOutlined,
  RightOutlined,
  SyncOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useCreate, useList, usePermissions } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import {
  CALENDAR_LEGEND,
  CALENDAR_CATEGORY_ORDER,
  type CalendarCategory,
  type CalendarEvent,
} from "../types/calendar";
import { useEvents } from "../hooks/use-events";
import { resolveActiveTerm } from "../utils/terms";

type TermRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  year: string;
  semester: 1 | 2;
  active?: boolean;
  isActive?: boolean;
};

type ClassRecord = {
  id: string;
  name: string;
  code?: string;
  level?: number;
};

type CalendarViewMode = "month" | "week" | "day";

type NewEventFormValues = {
  title: string;
  period: [Dayjs, Dayjs];
  category: CalendarCategory;
  allDay: boolean;
  audience?: string;
  organizer?: string;
  location?: string;
  description?: string;
  tags?: string[];
  classIds?: string[];
};

type CreateCalendarEventPayload = {
  title: string;
  startDate: string;
  endDate: string;
  category: CalendarCategory;
  termId?: string;
  allDay?: boolean;
  audience?: string;
  organizer?: string;
  location?: string;
  description?: string;
  tags?: string[];
  relatedClassIds?: string[];
  source: "MANUAL";
};

const { RangePicker } = DatePicker;

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DAY_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});
const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const AUDIENCE_OPTIONS = [
  { label: "Semua", value: "ALL" },
  { label: "Guru", value: "GURU" },
  { label: "Siswa", value: "SISWA" },
  { label: "Orang Tua", value: "ORTU" },
];

const formatAudience = (
  audience: string | undefined,
  classLookup: Map<string, ClassRecord>
): string => {
  if (!audience || audience === "ALL") return "Seluruh warga sekolah";
  if (audience === "GURU") return "Guru & staf";
  if (audience === "SISWA") return "Siswa";
  if (audience === "ORTU") return "Orang tua / wali";
  if (audience.startsWith("CLASS:")) {
    const classId = audience.split(":")[1] ?? "";
    const klass = classLookup.get(classId);
    return klass ? `Kelas ${klass.name}` : `Kelas ${classId}`;
  }
  return audience;
};

const clampDateToTerm = (value: Dayjs, term: TermRecord | null): Dayjs => {
  if (!term) return value;
  const termStart = dayjs(term.startDate);
  const termEnd = dayjs(term.endDate);
  if (!termStart.isValid() || !termEnd.isValid()) {
    return value;
  }
  if (value.isBefore(termStart)) return termStart;
  if (value.isAfter(termEnd)) return termEnd;
  return value;
};

const formatEventRange = (event: CalendarEvent): string => {
  const start = dayjs(event.start);
  const end = dayjs(event.end ?? event.start);
  if (!start.isValid()) {
    return "-";
  }

  const sameDay = end.isValid() ? start.isSame(end, "day") : true;
  if (sameDay) {
    if (!end.isValid() || event.allDay) {
      return DATE_FORMATTER.format(start.toDate());
    }
    return `${DATE_FORMATTER.format(start.toDate())} • ${TIME_FORMATTER.format(start.toDate())} - ${TIME_FORMATTER.format(end.toDate())}`;
  }

  if (event.allDay) {
    return `${DATE_FORMATTER.format(start.toDate())} → ${DATE_FORMATTER.format(end.toDate())}`;
  }

  return `${DATE_FORMATTER.format(start.toDate())} ${TIME_FORMATTER.format(start.toDate())} → ${DATE_FORMATTER.format(end.toDate())} ${TIME_FORMATTER.format(end.toDate())}`;
};

const disabledDateFactory =
  (term: TermRecord | null) =>
  (currentDate: Dayjs): boolean => {
    if (!term) return false;
    const termStart = dayjs(term.startDate).startOf("day");
    const termEnd = dayjs(term.endDate).endOf("day");
    if (!termStart.isValid() || !termEnd.isValid()) {
      return false;
    }
    return currentDate.isBefore(termStart, "day") || currentDate.isAfter(termEnd, "day");
  };

export const CalendarPage: React.FC = () => {
  const [form] = Form.useForm<NewEventFormValues>();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: permissionsRole } = usePermissions<string>();
  const resolvedRole = useMemo(() => {
    if (permissionsRole) {
      return permissionsRole;
    }
    if (typeof window !== "undefined") {
      try {
        const role = window.localStorage.getItem("auth_role");
        if (role) {
          return role;
        }
      } catch {
        // ignore localStorage issues
      }
    }
    return undefined;
  }, [permissionsRole]);

  const canManageAll =
    resolvedRole === "SUPERADMIN" ||
    resolvedRole === "ADMIN_TU" ||
    resolvedRole === "KEPALA_SEKOLAH";
  const canCreateAgenda =
    canManageAll || resolvedRole === "GURU_MAPEL" || resolvedRole === "WALI_KELAS";

  const [selectedTermId, setSelectedTermId] = useState<string>();
  const [selectedYear, setSelectedYear] = useState<string>();
  const [selectedSemester, setSelectedSemester] = useState<number>();
  const [selectedCategories, setSelectedCategories] = useState<CalendarCategory[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Dayjs>(() => dayjs());
  const [searchValue, setSearchValue] = useState<string>("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const lastSearchRef = useRef<string>("");

  const { open: notify } = useAppNotification();

  const termsQuery = useList<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 20 },
    sorters: [{ field: "startDate", order: "asc" }],
  });

  const classesQuery = useList<ClassRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
    sorters: [
      { field: "level", order: "asc" },
      { field: "name", order: "asc" },
    ],
  });

  const classes = classesQuery.data?.data ?? [];
  const classLookup = useMemo(
    () => new Map<string, ClassRecord>(classes.map((klass) => [klass.id, klass])),
    [classes]
  );

  const terms = termsQuery.data?.data ?? [];
  const selectedTerm = useMemo(
    () => terms.find((term) => term.id === selectedTermId) ?? null,
    [selectedTermId, terms]
  );

  useEffect(() => {
    if (!terms.length) {
      return;
    }
    if (!selectedTermId) {
      const active = resolveActiveTerm(terms);
      if (!active) {
        return;
      }
      setSelectedTermId(active.id);
      setSelectedYear(active.year);
      setSelectedSemester(active.semester);
      setCurrentDate(clampDateToTerm(dayjs(active.startDate), active));
    } else {
      const exists = terms.some((term) => term.id === selectedTermId);
      if (!exists) {
        const fallback = terms[0];
        setSelectedTermId(fallback.id);
        setSelectedYear(fallback.year);
        setSelectedSemester(fallback.semester);
        setCurrentDate(clampDateToTerm(dayjs(fallback.startDate), fallback));
      }
    }
  }, [selectedTermId, terms]);

  useEffect(() => {
    if (!selectedTerm) return;
    if (selectedYear !== selectedTerm.year) {
      setSelectedYear(selectedTerm.year);
    }
    if (selectedSemester !== selectedTerm.semester) {
      setSelectedSemester(selectedTerm.semester);
    }
    setCurrentDate((prev) => clampDateToTerm(prev, selectedTerm));
  }, [selectedTerm, selectedYear, selectedSemester]);

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(terms.map((term) => term.year))).map((year) => ({
        label: year,
        value: year,
      })),
    [terms]
  );

  const semesterOptions = useMemo(() => {
    const baseYear = selectedYear ?? selectedTerm?.year;
    return terms
      .filter((term) => term.year === baseYear)
      .map((term) => ({
        label: term.semester === 1 ? "Ganjil" : "Genap",
        value: term.semester,
        termId: term.id,
      }));
  }, [selectedTerm?.year, selectedYear, terms]);

  const monthOptions = useMemo(() => {
    if (!selectedTerm) {
      return [];
    }
    const months: Dayjs[] = [];
    let cursor = dayjs(selectedTerm.startDate).startOf("month");
    const endMonth = dayjs(selectedTerm.endDate).endOf("month");
    while (cursor.isBefore(endMonth) || cursor.isSame(endMonth, "month")) {
      months.push(cursor);
      cursor = cursor.add(1, "month");
    }
    return months.map((month) => ({
      label: MONTH_FORMATTER.format(month.toDate()),
      value: month.startOf("month").toISOString(),
    }));
  }, [selectedTerm]);

  const handleYearChange = useCallback(
    (value: string) => {
      setSelectedYear(value);
      const preferredSemester = selectedSemester;
      const fallback =
        terms.find((term) => term.year === value && term.semester === preferredSemester) ??
        terms.find((term) => term.year === value);
      if (fallback) {
        setSelectedTermId(fallback.id);
        setSelectedSemester(fallback.semester);
        setCurrentDate(clampDateToTerm(dayjs(fallback.startDate), fallback));
      }
    },
    [selectedSemester, terms]
  );

  const handleSemesterChange = useCallback(
    (value: number) => {
      setSelectedSemester(value);
      const targetYear = selectedYear ?? selectedTerm?.year;
      const fallback = terms.find((term) => term.year === targetYear && term.semester === value);
      if (fallback) {
        setSelectedTermId(fallback.id);
        setCurrentDate(clampDateToTerm(dayjs(fallback.startDate), fallback));
      }
    },
    [selectedTerm?.year, selectedYear, terms]
  );

  const handleMonthChange = useCallback(
    (value: string) => {
      const candidate = dayjs(value);
      if (candidate.isValid()) {
        setCurrentDate(clampDateToTerm(candidate, selectedTerm));
      }
    },
    [selectedTerm]
  );

  const handleViewNavigate = useCallback(
    (direction: -1 | 1) => {
      setCurrentDate((prev) => {
        const unit = viewMode === "month" ? "month" : viewMode === "week" ? "week" : "day";
        const candidate = prev.add(direction, unit);
        return clampDateToTerm(candidate, selectedTerm);
      });
    },
    [selectedTerm, viewMode]
  );

  useEffect(() => {
    setCurrentDate((prev) => clampDateToTerm(prev, selectedTerm));
  }, [selectedTerm, viewMode]);

  const viewRange = useMemo(() => {
    if (!selectedTerm) {
      return null;
    }
    let start = currentDate;
    let end = currentDate;

    if (viewMode === "month") {
      start = currentDate.startOf("month");
      end = currentDate.endOf("month");
    } else if (viewMode === "week") {
      start = currentDate.startOf("week");
      end = currentDate.endOf("week");
    } else {
      start = currentDate.startOf("day");
      end = currentDate.endOf("day");
    }

    const termStart = dayjs(selectedTerm.startDate).startOf("day");
    const termEnd = dayjs(selectedTerm.endDate).endOf("day");

    const clampedStart = start.isBefore(termStart) ? termStart : start;
    let clampedEnd = end.isAfter(termEnd) ? termEnd : end;

    if (clampedEnd.isBefore(clampedStart)) {
      clampedEnd = clampedStart;
    }

    return {
      start: clampedStart,
      end: clampedEnd,
    };
  }, [currentDate, selectedTerm, viewMode]);

  const eventsQuery = useEvents({
    termId: selectedTermId,
    categories: selectedCategories.length ? selectedCategories : undefined,
    range: viewRange
      ? { start: viewRange.start.toISOString(), end: viewRange.end.toISOString() }
      : undefined,
  });

  const { mutateAsync: createEvent, isLoading: isCreating } =
    useCreate<CreateCalendarEventPayload>();

  const filteredEvents = eventsQuery.filteredEvents;
  const searchMatches = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return filteredEvents.filter((event) => {
      if (event.title.toLowerCase().includes(normalized)) return true;
      if (event.description && event.description.toLowerCase().includes(normalized)) return true;
      if (event.organizer && event.organizer.toLowerCase().includes(normalized)) return true;
      return event.tags?.some((tag) => tag.toLowerCase().includes(normalized));
    });
  }, [filteredEvents, searchValue]);

  useEffect(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) {
      lastSearchRef.current = "";
      return;
    }
    if (normalized === lastSearchRef.current) {
      return;
    }
    lastSearchRef.current = normalized;
    const firstMatch = searchMatches[0];
    if (firstMatch) {
      const eventStart = dayjs(firstMatch.start);
      if (eventStart.isValid()) {
        setCurrentDate(clampDateToTerm(eventStart, selectedTerm));
      }
    }
  }, [searchMatches, searchValue, selectedTerm]);

  const highlightedEventIds = useMemo(
    () => new Set(searchMatches.map((event) => event.id)),
    [searchMatches]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((event) => {
      const start = dayjs(event.start).startOf("day");
      const end = dayjs(event.end ?? event.start).startOf("day");
      if (!start.isValid()) return;
      const finalEnd = end.isValid() ? end : start;
      let cursor = start.clone();
      while (cursor.isBefore(finalEnd) || cursor.isSame(finalEnd, "day")) {
        const key = cursor.format("YYYY-MM-DD");
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(event);
        cursor = cursor.add(1, "day");
      }
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
    });
    return map;
  }, [filteredEvents]);

  const listDays = useMemo(() => {
    if (!viewRange) {
      return [];
    }
    const days: Dayjs[] = [];
    let cursor = viewRange.start.startOf("day");
    while (cursor.isBefore(viewRange.end) || cursor.isSame(viewRange.end, "day")) {
      days.push(cursor);
      cursor = cursor.add(1, "day");
    }
    return days;
  }, [viewRange]);

  const handleCategoryChange = useCallback(
    (values: string[]) => {
      setSelectedCategories(values as CalendarCategory[]);
    },
    [setSelectedCategories]
  );

  const handleSearchInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    if (!value.trim()) {
      lastSearchRef.current = "";
    }
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (!value.trim()) {
      lastSearchRef.current = "";
    }
  }, []);

  const dateCellRender = useCallback(
    (value: Dayjs) => {
      const key = value.format("YYYY-MM-DD");
      const dayEvents = eventsByDate[key];
      if (!dayEvents || dayEvents.length === 0) {
        return null;
      }

      const displayEvents = dayEvents.slice(0, 3);
      const overflowCount = dayEvents.length - displayEvents.length;

      return (
        <Space direction="vertical" size={4} style={{ width: "100%", alignItems: "stretch" }}>
          {displayEvents.map((event) => {
            const isHighlighted = highlightedEventIds.has(event.id);
            const textColor = event.textColor ?? (event.icon === "⚪" ? "#1f2937" : "#ffffff");
            return (
              <Tooltip
                key={event.id}
                placement="top"
                title={
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>{event.title}</Typography.Text>
                    <Typography.Text type="secondary">{formatEventRange(event)}</Typography.Text>
                    <Tag color={event.color} style={{ margin: 0, color: textColor }}>
                      {event.icon} {event.categoryLabel}
                    </Tag>
                  </Space>
                }
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEvent(event)}
                  onKeyPress={() => setSelectedEvent(event)}
                  style={{
                    backgroundColor: event.color,
                    color: textColor,
                    padding: "2px 6px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    cursor: "pointer",
                    boxShadow: isHighlighted ? `0 0 0 2px rgba(37,99,235,0.35)` : undefined,
                    opacity: isHighlighted ? 1 : 0.9,
                    transition: "box-shadow 0.2s ease, opacity 0.2s ease",
                  }}
                >
                  <span aria-hidden>{event.icon}</span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {event.title}
                  </span>
                </div>
              </Tooltip>
            );
          })}
          {overflowCount > 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              +{overflowCount} agenda lainnya
            </Typography.Text>
          ) : null}
        </Space>
      );
    },
    [eventsByDate, highlightedEventIds]
  );

  const disabledDate = useMemo(() => disabledDateFactory(selectedTerm), [selectedTerm]);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      return MONTH_FORMATTER.format(currentDate.toDate());
    }
    if (viewMode === "week" && viewRange) {
      return `${DATE_SHORT_FORMATTER.format(viewRange.start.toDate())} – ${DATE_SHORT_FORMATTER.format(viewRange.end.toDate())}`;
    }
    if (viewMode === "day") {
      return DATE_FORMATTER.format(currentDate.toDate());
    }
    return MONTH_FORMATTER.format(currentDate.toDate());
  }, [currentDate, viewMode, viewRange]);

  const termRangeLabel = useMemo(() => {
    if (!selectedTerm) return "";
    const start = DATE_SHORT_FORMATTER.format(new Date(selectedTerm.startDate));
    const end = DATE_SHORT_FORMATTER.format(new Date(selectedTerm.endDate));
    return `${start} – ${end}`;
  }, [selectedTerm]);

  const handleSync = useCallback(async () => {
    try {
      await eventsQuery.refetch();
      notify?.({
        type: "success",
        message: "Sinkronisasi selesai",
        description: "Event dari jadwal ujian dan pengumuman berhasil dimuat ulang.",
      });
    } catch (error) {
      notify?.({
        type: "error",
        message: "Sinkronisasi gagal",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan saat sinkronisasi.",
      });
    }
  }, [eventsQuery, notify]);

  const handlePrint = useCallback(() => {
    notify?.({
      type: "info",
      message: "Menyiapkan tampilan cetak",
      description: "Gunakan dialog print browser untuk menyimpan ke PDF.",
    });
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, [notify]);

  const handleOpenCreate = useCallback(() => {
    if (!selectedTerm) {
      notify?.({
        type: "warning",
        message: "Pilih tahun ajar terlebih dahulu",
      });
      return;
    }
    const defaultCategory =
      selectedCategories[0] ?? CALENDAR_CATEGORY_ORDER[0] ?? "SCHOOL_ACTIVITY";
    const start = clampDateToTerm(currentDate.startOf("day"), selectedTerm);
    form.setFieldsValue({
      title: "",
      category: defaultCategory,
      allDay: true,
      audience: "ALL",
      period: [start, start.add(2, "hour")],
      tags: [],
      classIds: [],
    });
    setCreateModalOpen(true);
  }, [currentDate, form, notify, selectedCategories, selectedTerm]);

  const handleCreateEvent = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!values.period || !values.period[0] || !values.period[1]) {
        throw new Error("Tanggal event wajib diisi.");
      }
      if (!selectedTermId) {
        notify?.({
          type: "warning",
          message: "Pilih tahun ajar terlebih dahulu",
        });
        return;
      }
      const startValue = values.period[0];
      const endValue = values.period[1] ?? values.period[0];
      const startIso = (values.allDay ? startValue.startOf("day") : startValue).toISOString();
      const endIso = (values.allDay ? endValue.endOf("day") : endValue).toISOString();

      const payload: CreateCalendarEventPayload = {
        title: values.title,
        category: values.category,
        startDate: startIso,
        endDate: endIso,
        termId: selectedTermId,
        allDay: values.allDay,
        audience: values.audience,
        organizer: values.organizer,
        location: values.location,
        description: values.description,
        tags: values.tags?.filter(Boolean),
        relatedClassIds: values.classIds?.filter(Boolean),
        source: "MANUAL",
      };

      await createEvent({
        resource: "calendar-events",
        values: payload,
      });

      notify?.({
        type: "success",
        message: "Event ditambahkan",
        description: `${values.title} berhasil disimpan ke kalender.`,
      });

      setCreateModalOpen(false);
      form.resetFields();
      await eventsQuery.refetch();
    } catch (error) {
      if (error instanceof Error) {
        notify?.({
          type: "error",
          message: "Gagal menyimpan event",
          description: error.message,
        });
      }
    }
  }, [createEvent, eventsQuery, form, notify, selectedTermId]);

  const enterpriseCardStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    boxShadow: "none",
    borderRadius: 6,
  };

  const listView = useMemo(() => {
    if (!listDays.length) {
      return (
        <Empty
          description="Tidak ada agenda pada rentang tanggal ini."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {listDays.map((day) => {
          const key = day.format("YYYY-MM-DD");
          const dayEvents = eventsByDate[key] ?? [];
          return (
            <Card key={key} size="small" bodyStyle={{ padding: 16 }} style={enterpriseCardStyle}>
              <Space
                align="center"
                style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap" }}
              >
                <Typography.Text strong>{DAY_SHORT_FORMATTER.format(day.toDate())}</Typography.Text>
                <Tag color="blue" style={{ marginBottom: 0 }}>
                  {dayEvents.length} agenda
                </Tag>
              </Space>
              <Divider style={{ margin: "12px 0" }} />
              {dayEvents.length === 0 ? (
                <Typography.Text type="secondary">Tidak ada kegiatan.</Typography.Text>
              ) : (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {dayEvents.map((event) => {
                    const isHighlighted = highlightedEventIds.has(event.id);
                    const textColor =
                      event.textColor ?? (event.icon === "⚪" ? "#1f2937" : "#ffffff");
                    return (
                      <Card
                        key={event.id}
                        size="small"
                        hoverable
                        onClick={() => setSelectedEvent(event)}
                        style={enterpriseCardStyle}
                        bodyStyle={{
                          padding: 12,
                          borderLeft: `4px solid ${event.color}`,
                          background: isHighlighted
                            ? "rgba(37,99,235,0.08)"
                            : "rgba(148,163,184,0.08)",
                        }}
                      >
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                          <Space style={{ justifyContent: "space-between", width: "100%" }}>
                            <Typography.Text strong>{event.title}</Typography.Text>
                            <Tag color={event.color} style={{ marginBottom: 0, color: textColor }}>
                              {event.icon} {event.categoryLabel}
                            </Tag>
                          </Space>
                          <Space size="small" style={{ flexWrap: "wrap" }}>
                            <Typography.Text type="secondary">
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {formatEventRange(event)}
                            </Typography.Text>
                            {event.location ? (
                              <Typography.Text type="secondary">
                                <EnvironmentOutlined style={{ marginRight: 4 }} />
                                {event.location}
                              </Typography.Text>
                            ) : null}
                            <Typography.Text type="secondary">
                              <TeamOutlined style={{ marginRight: 4 }} />
                              {formatAudience(event.audience, classLookup)}
                            </Typography.Text>
                          </Space>
                          {event.tags?.length ? (
                            <Space size={[6, 6]} wrap>
                              {event.tags.map((tag) => (
                                <Tag key={tag} bordered={false}>
                                  #{tag}
                                </Tag>
                              ))}
                            </Space>
                          ) : null}
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Card>
          );
        })}
      </Space>
    );
  }, [classLookup, eventsByDate, highlightedEventIds, listDays]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Kalender Pendidikan {selectedTerm?.name ?? ""}
        </Typography.Title>
        <Typography.Text type="secondary">
          Memetakan hari efektif, libur, ujian, dan kegiatan sekolah pada tahun ajar berjalan.
        </Typography.Text>
      </Space>

      <Card style={enterpriseCardStyle}>
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          size={isMobile ? 12 : 16}
          style={{ width: "100%", flexWrap: "wrap" }}
        >
          <Select
            style={{ minWidth: 160 }}
            placeholder="Tahun Ajar"
            options={yearOptions}
            value={selectedYear}
            onChange={handleYearChange}
            allowClear={false}
          />
          <Select
            style={{ minWidth: 160 }}
            placeholder="Semester"
            options={semesterOptions}
            value={selectedSemester}
            onChange={handleSemesterChange}
            allowClear={false}
          />
          <Select
            mode="multiple"
            style={{ minWidth: 220, flex: 1 }}
            placeholder="Filter kategori"
            value={selectedCategories}
            onChange={handleCategoryChange}
            maxTagCount="responsive"
            options={CALENDAR_LEGEND.map((item) => ({
              label: (
                <Space>
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Space>
              ),
              value: item.key,
            }))}
          />
          <Input.Search
            style={{ maxWidth: isMobile ? "100%" : 240 }}
            placeholder="Cari event (contoh: PTS)"
            allowClear
            value={searchValue}
            onChange={handleSearchInput}
            onSearch={handleSearch}
          />
        </Space>
      </Card>

      <Card style={enterpriseCardStyle}>
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          size={16}
          align="start"
          style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap" }}
        >
          <Space direction="vertical" size={4}>
            <Space align="center">
              <CalendarOutlined style={{ color: "#2563eb" }} />
              <Typography.Title level={4} style={{ margin: 0 }}>
                {headerLabel}
              </Typography.Title>
            </Space>
            <Typography.Text type="secondary">{termRangeLabel}</Typography.Text>
            <Tag color="blue" style={{ width: "fit-content" }}>
              {filteredEvents.length} agenda terlihat
            </Tag>
          </Space>

          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            size={isMobile ? 8 : 12}
            style={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            <Space.Compact>
              <Button
                icon={<LeftOutlined />}
                aria-label="Bulan sebelumnya"
                onClick={() => handleViewNavigate(-1)}
              />
              <Select
                style={{ minWidth: 180 }}
                value={
                  monthOptions.find((option) => dayjs(option.value).isSame(currentDate, "month"))
                    ?.value
                }
                onChange={handleMonthChange}
                options={monthOptions}
                placeholder="Pilih bulan"
              />
              <Button
                icon={<RightOutlined />}
                aria-label="Bulan berikutnya"
                onClick={() => handleViewNavigate(1)}
              />
            </Space.Compact>

            <Segmented
              options={[
                { label: "Bulan", value: "month" },
                { label: "Minggu", value: "week" },
                { label: "Hari", value: "day" },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as CalendarViewMode)}
            />

            {canCreateAgenda ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                Tambah Event
              </Button>
            ) : null}

            {canManageAll ? (
              <>
                <Button icon={<SyncOutlined />} onClick={handleSync}>
                  Sinkron Jadwal Ujian
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  Cetak PDF
                </Button>
              </>
            ) : null}
          </Space>
        </Space>

        <Divider />

        <Spin spinning={eventsQuery.isFetching && filteredEvents.length === 0}>
          {viewMode === "month" ? (
            <AntdCalendar
              locale={idLocale}
              fullscreen={false}
              value={currentDate}
              onSelect={(value) => setCurrentDate(clampDateToTerm(value, selectedTerm))}
              headerRender={() => null}
              cellRender={dateCellRender}
              disabledDate={disabledDate}
            />
          ) : (
            listView
          )}
        </Spin>

        {searchValue.trim() && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            {searchMatches.length > 0
              ? `${searchMatches.length} event cocok dengan pencarian "${searchValue}".`
              : `Tidak ditemukan event dengan kata kunci "${searchValue}".`}
          </Typography.Paragraph>
        )}

        <Divider />

        <Space size={[12, 12]} wrap>
          {CALENDAR_LEGEND.map((item) => (
            <Tag
              key={item.key}
              color={item.color}
              style={{ margin: 0, color: item.textColor ?? "#ffffff" }}
            >
              {item.icon} {item.label}
            </Tag>
          ))}
        </Space>
      </Card>

      <Drawer
        width={isMobile ? "100%" : 420}
        title={selectedEvent?.title}
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Tag
              color={selectedEvent.color}
              style={{ width: "fit-content", color: selectedEvent.textColor ?? "#ffffff" }}
            >
              {selectedEvent.icon} {selectedEvent.categoryLabel}
            </Tag>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {formatEventRange(selectedEvent)}
            </Typography.Paragraph>
            {selectedEvent.location ? (
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                {selectedEvent.location}
              </Typography.Paragraph>
            ) : null}
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <TeamOutlined style={{ marginRight: 8 }} />
              {formatAudience(selectedEvent.audience, classLookup)}
            </Typography.Paragraph>
            <Typography.Text type="secondary">Sumber: {selectedEvent.sourceLabel}</Typography.Text>
            <Divider />
            {selectedEvent.description ? (
              <Typography.Paragraph>{selectedEvent.description}</Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary">Tidak ada catatan tambahan.</Typography.Text>
            )}
            {selectedEvent.tags?.length ? (
              <>
                <Typography.Text strong>Tag</Typography.Text>
                <Space size={[6, 6]} wrap>
                  {selectedEvent.tags.map((tag) => (
                    <Tag key={tag}>#{tag}</Tag>
                  ))}
                </Space>
              </>
            ) : null}
            {selectedEvent.relatedClassIds?.length ? (
              <>
                <Typography.Text strong>Kelas Terkait</Typography.Text>
                <Space size={[6, 6]} wrap>
                  {selectedEvent.relatedClassIds.map((id) => {
                    const klass = classLookup.get(id);
                    return <Tag key={id}>{klass?.name ?? id}</Tag>;
                  })}
                </Space>
              </>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="Tambah Event Kalender"
        open={isCreateModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateEvent}
        okText="Simpan"
        cancelText="Batal"
        confirmLoading={isCreating}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nama Event"
            name="title"
            rules={[{ required: true, message: "Nama event wajib diisi" }]}
          >
            <Input placeholder="Contoh: Ujian Tengah Semester Ganjil" />
          </Form.Item>
          <Form.Item
            label="Kategori"
            name="category"
            rules={[{ required: true, message: "Kategori wajib dipilih" }]}
          >
            <Select
              options={CALENDAR_LEGEND.map((item) => ({
                label: `${item.icon} ${item.label}`,
                value: item.key,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Rentang Waktu"
            name="period"
            rules={[{ required: true, message: "Tanggal event wajib diisi" }]}
          >
            <RangePicker
              style={{ width: "100%" }}
              showTime={{ format: "HH:mm" }}
              format="DD MMM YYYY HH:mm"
              disabledDate={disabledDate}
            />
          </Form.Item>
          <Form.Item label="Sepanjang Hari" name="allDay" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Penanggung Jawab" name="organizer">
            <Input placeholder="Contoh: Waka Kurikulum" />
          </Form.Item>
          <Form.Item label="Lokasi" name="location">
            <Input placeholder="Contoh: Aula Sekolah" />
          </Form.Item>
          <Form.Item label="Audiens" name="audience" initialValue="ALL">
            <Select options={AUDIENCE_OPTIONS} allowClear placeholder="Pilih audiens utama" />
          </Form.Item>
          <Form.Item label="Kelas Terkait" name="classIds">
            <Select
              mode="multiple"
              options={classes.map((klass) => ({
                label: klass.name,
                value: klass.id,
              }))}
              placeholder="Pilih kelas"
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item label="Tag" name="tags">
            <Select mode="tags" placeholder="Tambahkan tag (opsional)" />
          </Form.Item>
          <Form.Item label="Catatan" name="description">
            <Input.TextArea rows={3} placeholder="Informasi tambahan event" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
