import { useList } from "../hooks/use-refine-list";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { List, useTable } from "@refinedev/antd";
import { useCreate, useDelete, useNavigation, type CrudFilter } from "@refinedev/core";
import { isTermActive } from "../utils/terms";
import { useAppNotification } from "../hooks/use-app-notification";
import dayjs from "dayjs";
import { ResourceActionGuard } from "../components/resource-action-guard";

const WEEK_DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
];

const DAY_OPTIONS = [
  { value: "MONDAY", label: "Senin" },
  { value: "TUESDAY", label: "Selasa" },
  { value: "WEDNESDAY", label: "Rabu" },
  { value: "THURSDAY", label: "Kamis" },
  { value: "FRIDAY", label: "Jumat" },
  { value: "SATURDAY", label: "Sabtu" },
];

const DAY_MAP_TO_NAME: Record<string, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
  "1": "Senin",
  "2": "Selasa",
  "3": "Rabu",
  "4": "Kamis",
  "5": "Jumat",
  "6": "Sabtu",
  "7": "Minggu",
};

const DAY_NAME_TO_INT: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

const SLOT_START_TIMES = ["07:00", "07:50", "08:40", "09:40", "10:30", "11:20", "12:45", "13:35"];

type ScheduleResource = {
  id: string;
  termId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  dayOfWeek: string | number;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  classSubjectId?: string;
};

type ClassSubjectResource = {
  id: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  termId?: string;
};

type ClassResource = {
  id: string;
  name: string;
  code?: string;
};

type SubjectResource = {
  id: string;
  name: string;
  code?: string;
};

type TeacherResource = {
  id: string;
  fullName: string;
};

type TermResource = {
  id: string;
  name: string;
  active?: boolean;
  isActive?: boolean;
  year: string;
  semester: number;
};

type EnrichedSchedule = ScheduleResource & {
  className?: string;
  classId?: string;
  teacherName?: string;
  teacherId?: string;
  subjectName?: string;
  subjectId?: string;
  termId?: string;
  dayLabel: string;
  periodLabel?: string;
};

const resolveDayLabel = (value?: string | number) => {
  if (value === undefined || value === null) return "-";
  const str = String(value).toUpperCase();
  return DAY_MAP_TO_NAME[str] ?? `Hari ${value}`;
};

const resolveDayNumber = (value?: string | number): number => {
  if (typeof value === "number") return value;
  const num = Number(value);
  if (!Number.isNaN(num) && num >= 1 && num <= 7) return num;
  return DAY_NAME_TO_INT[String(value).toUpperCase()] ?? 1;
};

const resolvePeriodLabel = (startTime?: string) => {
  if (!startTime) return undefined;
  const index = SLOT_START_TIMES.indexOf(startTime.slice(0, 5));
  if (index === -1) return undefined;
  return `${index + 1}`;
};

export const SchedulesPage: React.FC = () => {
  const { create: navigateCreate, edit } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteOne } = useDelete();
  const {
    mutateAsync: createOne,
    mutation: { isPending: isDuplicating },
  } = useCreate();

  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<string | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    tableProps,
    setFilters,
    tableQuery: { refetch } = {},
  } = useTable<EnrichedSchedule>({
    resource: "schedules",
    pagination: { pageSize: 20 },
    sorters: {
      initial: [
        {
          field: "dayOfWeek",
          order: "asc",
        },
      ],
    },
  });

  const {
    result: classSubjectResponse,
    query: { isLoading: loadingClassSubjects },
  } = useList<ClassSubjectResource>({
    resource: "class-subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const {
    result: classesResponse,
    query: { isLoading: loadingClasses },
  } = useList<ClassResource>({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const {
    result: subjectsResponse,
    query: { isLoading: loadingSubjects },
  } = useList<SubjectResource>({
    resource: "subjects",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const {
    result: teachersResponse,
    query: { isLoading: loadingTeachers },
  } = useList<TeacherResource>({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const {
    result: termsResponse,
    query: { isLoading: loadingTerms },
  } = useList<TermResource>({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const { result: allSchedulesResponse } = useList<ScheduleResource>({
    resource: "schedules",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classSubjects = (classSubjectResponse?.data ?? []) as ClassSubjectResource[];
  const classes = (classesResponse?.data ?? []) as ClassResource[];
  const subjects = (subjectsResponse?.data ?? []) as SubjectResource[];
  const teachers = (teachersResponse?.data ?? []) as TeacherResource[];
  const terms = (termsResponse?.data ?? []) as TermResource[];
  const allSchedules = (allSchedulesResponse?.data ?? []) as ScheduleResource[];

  useEffect(() => {
    if (selectedYear || selectedSemester) return;
    const activeTerm = terms.find(isTermActive);
    if (activeTerm) {
      setSelectedYear(activeTerm.year);
      setSelectedSemester(String(activeTerm.semester));
    }
  }, [terms, selectedYear, selectedSemester]);

  const yearOptions = useMemo(() => {
    const uniqueYears = Array.from(new Set(terms.map((term) => term.year)));
    return uniqueYears.map((year) => ({ label: year, value: year }));
  }, [terms]);

  const classOptions = useMemo(
    () =>
      classes.map((klass) => ({
        label: klass.name,
        value: klass.id,
      })),
    [classes]
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        label: teacher.fullName,
        value: teacher.id,
      })),
    [teachers]
  );

  const subjectMap = useMemo(() => {
    const map = new Map(subjects.map((subject) => [subject.id, subject]));
    return map;
  }, [subjects]);

  const classMap = useMemo(() => {
    const map = new Map(classes.map((klass) => [klass.id, klass]));
    return map;
  }, [classes]);

  const teacherMap = useMemo(() => {
    const map = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    return map;
  }, [teachers]);

  const termMap = useMemo(() => {
    const map = new Map(terms.map((term) => [term.id, term]));
    return map;
  }, [terms]);

  const matchingTermIds = useMemo(() => {
    if (!selectedYear && !selectedSemester) return undefined;
    const filtered = terms.filter((term) => {
      const yearMatch = selectedYear ? term.year === selectedYear : true;
      const semesterMatch = selectedSemester ? String(term.semester) === selectedSemester : true;
      return yearMatch && semesterMatch;
    });
    return filtered.length > 0 ? filtered.map((term) => term.id) : [];
  }, [selectedYear, selectedSemester, terms]);

  const weeklyGrid = useMemo(() => {
    if (!selectedClass) return null;
    const classSchedules = allSchedules.filter((entry) => {
      if (entry.classId === selectedClass) return true;
      if (entry.classSubjectId) {
        const mapping = classSubjects.find((m) => m.id === entry.classSubjectId);
        if (mapping && mapping.classroomId === selectedClass) return true;
      }
      return false;
    });
    if (classSchedules.length === 0) return null;

    const slotMap = new Map<string, { teacherName: string; subjectName: string; room?: string }>();

    classSchedules.forEach((entry) => {
      const dayNum = resolveDayNumber(entry.dayOfWeek);
      const slotNumber = Number(resolvePeriodLabel(entry.startTime) ?? 0) || 1;
      const mapping = entry.classSubjectId
        ? classSubjects.find((m) => m.id === entry.classSubjectId)
        : undefined;

      const teacherId = entry.teacherId ?? mapping?.teacherId;
      const subjectId = entry.subjectId ?? mapping?.subjectId;
      const teacher = teacherId ? teacherMap.get(teacherId) : undefined;
      const subject = subjectId ? subjectMap.get(subjectId) : undefined;

      const key = `${dayNum}-${slotNumber}`;
      slotMap.set(key, {
        teacherName: teacher?.fullName ?? "Guru",
        subjectName: subject?.name ?? "Mapel",
        room: entry.room,
      });
    });

    const rows = SLOT_START_TIMES.map((start, index) => {
      const slotNumber = index + 1;
      const fallbackEnd = dayjs(start, "HH:mm").add(45, "minute").format("HH:mm");
      const referenceEntry = classSchedules.find(
        (entry) =>
          Number(resolvePeriodLabel(entry.startTime) ?? 0) === slotNumber ||
          (entry.timeSlot && entry.timeSlot.startsWith(start))
      );
      const timeLabel = referenceEntry
        ? (referenceEntry.timeSlot ??
          `${referenceEntry.startTime?.slice(0, 5)} - ${referenceEntry.endTime?.slice(0, 5)}`)
        : `${start} - ${fallbackEnd}`;
      const cells = WEEK_DAYS.map((day) => {
        const record = slotMap.get(`${day.value}-${slotNumber}`);
        return record ?? null;
      });
      return {
        slotNumber,
        timeLabel,
        cells,
      };
    });

    return rows;
  }, [allSchedules, classSubjects, selectedClass, subjects, teachers, subjectMap, teacherMap]);

  useEffect(() => {
    const nextFilters: CrudFilter[] = [];

    if (selectedDay) {
      nextFilters.push({
        field: "dayOfWeek",
        operator: "eq",
        value: selectedDay,
      });
    }

    if (selectedClass) {
      nextFilters.push({
        field: "classId",
        operator: "eq",
        value: selectedClass,
      });
    }

    if (selectedTeacher) {
      nextFilters.push({
        field: "teacherId",
        operator: "eq",
        value: selectedTeacher,
      });
    }

    if (matchingTermIds && matchingTermIds.length > 0) {
      if (matchingTermIds.length === 1) {
        nextFilters.push({
          field: "termId",
          operator: "eq",
          value: matchingTermIds[0],
        });
      } else {
        nextFilters.push({
          field: "termId",
          operator: "in",
          value: matchingTermIds,
        });
      }
    }

    setFilters?.(nextFilters, "replace");
  }, [matchingTermIds, selectedClass, selectedDay, selectedTeacher, setFilters]);

  const rawData = (tableProps.dataSource as ScheduleResource[] | undefined) ?? [];

  const enrichedData: EnrichedSchedule[] = useMemo(() => {
    return rawData.map((entry) => {
      let classroom = entry.classId ? classMap.get(entry.classId) : undefined;
      let subject = entry.subjectId ? subjectMap.get(entry.subjectId) : undefined;
      let teacher = entry.teacherId ? teacherMap.get(entry.teacherId) : undefined;
      let term = entry.termId ? termMap.get(entry.termId) : undefined;

      if ((!classroom || !subject || !teacher) && entry.classSubjectId) {
        const mapping = classSubjects.find((item) => item.id === entry.classSubjectId);
        if (mapping) {
          if (!classroom && mapping.classroomId) classroom = classMap.get(mapping.classroomId);
          if (!subject && mapping.subjectId) subject = subjectMap.get(mapping.subjectId);
          if (!teacher && mapping.teacherId) teacher = teacherMap.get(mapping.teacherId);
          if (!term && mapping.termId) term = termMap.get(mapping.termId);
        }
      }

      const dayNum = resolveDayNumber(entry.dayOfWeek);
      const period = entry.timeSlot || resolvePeriodLabel(entry.startTime) || "-";

      return {
        ...entry,
        dayOfWeek: dayNum,
        className:
          classroom?.name ??
          (entry.classId ? classMap.get(entry.classId)?.name || entry.classId : "-"),
        classId: entry.classId ?? classroom?.id,
        subjectName: subject?.name
          ? subject.code
            ? `${subject.name} (${subject.code})`
            : subject.name
          : entry.subjectId
            ? subjectMap.get(entry.subjectId)?.name || entry.subjectId
            : "Tanpa Mapel",
        subjectId: entry.subjectId ?? subject?.id,
        teacherName:
          teacher?.fullName ??
          (entry.teacherId ? teacherMap.get(entry.teacherId)?.fullName || entry.teacherId : "-"),
        teacherId: entry.teacherId ?? teacher?.id,
        termId: term?.id ?? entry.termId,
        dayLabel: resolveDayLabel(entry.dayOfWeek),
        periodLabel: period,
      };
    });
  }, [rawData, classSubjects, classMap, subjectMap, teacherMap, termMap]);

  const displayedData = useMemo(() => {
    const trimmed = searchValue.trim().toLowerCase();
    if (trimmed.length === 0) {
      return enrichedData;
    }
    return enrichedData.filter((item) => {
      const subject = (item.subjectName ?? "").toLowerCase();
      const classroom = (item.className ?? "").toLowerCase();
      const teacher = (item.teacherName ?? "").toLowerCase();
      return (
        subject.includes(trimmed) ||
        classroom.includes(trimmed) ||
        teacher.includes(trimmed) ||
        item.room?.toLowerCase().includes(trimmed) ||
        item.dayLabel.toLowerCase().includes(trimmed)
      );
    });
  }, [enrichedData, searchValue]);

  const handleClearFilters = () => {
    setSelectedDay(undefined);
    setSelectedClass(undefined);
    setSelectedTeacher(undefined);
    setSearchValue("");
  };

  const handleDelete = useCallback(
    (record: ScheduleResource) => {
      Modal.confirm({
        title: "Hapus jadwal?",
        content: "Tindakan ini akan menghapus jadwal pelajaran dan tidak dapat dibatalkan.",
        okText: "Hapus",
        okButtonProps: { danger: true },
        cancelText: "Batal",
        centered: true,
        onOk: () => {
          setDeletingId(record.id);
          deleteOne(
            { resource: "schedules", id: record.id },
            {
              onSuccess: async () => {
                setDeletingId(null);
                notify?.({
                  type: "success",
                  message: "Jadwal dihapus",
                });
                await refetch?.();
              },
              onError: (error: any) => {
                setDeletingId(null);
                notify?.({
                  type: "error",
                  message: "Gagal menghapus",
                  description: error?.message ?? "Tidak dapat menghapus jadwal.",
                });
              },
            }
          );
        },
      });
    },
    [deleteOne, notify, refetch]
  );

  const handleDuplicate = useCallback(
    async (record: EnrichedSchedule) => {
      const conflict = enrichedData.some(
        (entry) =>
          entry.id !== record.id &&
          entry.teacherId === record.teacherId &&
          entry.dayOfWeek === record.dayOfWeek &&
          (entry.timeSlot === record.timeSlot ||
            (entry.startTime && entry.startTime === record.startTime))
      );

      if (conflict) {
        notify?.({
          type: "error",
          message: "Tidak dapat menduplikasi",
          description: "Guru sudah mengajar di kelas lain pada jam ini.",
        });
        return;
      }

      try {
        await createOne({
          resource: "schedules",
          values: {
            termId: record.termId || matchingTermIds?.[0] || terms.find(isTermActive)?.id,
            classId: record.classId,
            subjectId: record.subjectId,
            teacherId: record.teacherId,
            dayOfWeek: String(record.dayOfWeek),
            timeSlot:
              record.timeSlot ||
              (record.startTime && record.endTime
                ? `${record.startTime}-${record.endTime}`
                : "07:30-09:00"),
            room: record.room || "-",
            classSubjectId: record.classSubjectId,
            startTime: record.startTime,
            endTime: record.endTime,
          },
        });

        notify?.({
          type: "success",
          message: "Jadwal diduplikasi",
          description: "Jadwal berhasil disalin untuk minggu berikutnya.",
        });
        await refetch?.();
      } catch (error) {
        notify?.({
          type: "error",
          message: "Gagal menduplikasi",
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [createOne, enrichedData, notify, refetch, matchingTermIds, terms]
  );

  const columns: ColumnsType<EnrichedSchedule> = useMemo(
    () => [
      {
        title: "Hari",
        dataIndex: "dayLabel",
        sorter: (a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek),
        width: 120,
        render: (value: string) => (
          <Space>
            <CalendarOutlined style={{ color: "#1d4ed8" }} />
            <span>{value}</span>
          </Space>
        ),
      },
      {
        title: "Jam / Sesi",
        dataIndex: "periodLabel",
        sorter: (a, b) => (a.periodLabel ?? "").localeCompare(b.periodLabel ?? ""),
        width: 140,
        render: (_: string | undefined, record) =>
          record.periodLabel && record.periodLabel !== "-" ? (
            <Tag color="blue">{record.periodLabel}</Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "Mapel",
        dataIndex: "subjectName",
        sorter: (a, b) => (a.subjectName ?? "").localeCompare(b.subjectName ?? ""),
      },
      {
        title: "Guru",
        dataIndex: "teacherName",
        sorter: (a, b) => (a.teacherName ?? "").localeCompare(b.teacherName ?? ""),
      },
      {
        title: "Kelas",
        dataIndex: "className",
        sorter: (a, b) => (a.className ?? "").localeCompare(b.className ?? ""),
      },
      {
        title: "Ruang",
        dataIndex: "room",
        width: 120,
        render: (value: string | undefined) => value ?? "-",
      },
      {
        title: "Aksi",
        key: "actions",
        width: 160,
        render: (_: unknown, record) => (
          <Space>
            <Tooltip title="Edit jadwal">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  edit("schedules", record.id);
                }}
              />
            </Tooltip>
            <Tooltip title="Duplikasi minggu berikutnya">
              <Button
                type="text"
                icon={<RedoOutlined />}
                loading={isDuplicating}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDuplicate(record);
                }}
              />
            </Tooltip>
            <Tooltip title="Hapus jadwal">
              <Button
                type="text"
                danger
                loading={deletingId === record.id}
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(record);
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [deletingId, edit, handleDelete, handleDuplicate, isDuplicating]
  );

  const handleExportPdf = useCallback(() => {
    const termId =
      matchingTermIds && matchingTermIds.length > 0
        ? matchingTermIds[0]
        : (terms.find(isTermActive)?.id ?? terms[0]?.id ?? "");
    const classIdParam = selectedClass ?? "";
    const url = `/api/v1/schedules/export/pdf?class_id=${encodeURIComponent(classIdParam)}&term_id=${encodeURIComponent(termId)}`;
    window.open(url, "_blank");
  }, [selectedClass, matchingTermIds, terms]);

  const isLoading =
    tableProps.loading ||
    loadingClassSubjects ||
    loadingClasses ||
    loadingSubjects ||
    loadingTeachers ||
    loadingTerms;

  const enterpriseCardStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    boxShadow: "none",
    borderRadius: 6,
  };

  const { dataSource: _ignoredDataSource, ...restTableProps } = tableProps;

  return (
    <ResourceActionGuard action="list" resourceName="schedules">
      <List
        headerButtons={() => (
          <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>
            Export PDF
          </Button>
        )}
        title={
          <Space direction="vertical" size={4}>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              Jadwal Pelajaran
            </Typography.Title>
            <Typography.Text type="secondary">
              Pantau dan kelola jadwal pelajaran berdasarkan tahun ajar, kelas, guru, dan hari.
            </Typography.Text>
          </Space>
        }
        headerProps={{ style: { marginBottom: 0 } }}
        contentProps={{ style: { padding: 0 } }}
      >
        <Space direction="vertical" size={24} style={{ width: "100%", padding: 24 }}>
          <Card style={enterpriseCardStyle}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Typography.Text strong>Filter Jadwal</Typography.Text>
              <Space wrap style={{ width: "100%" }}>
                <Select
                  style={{ minWidth: 180 }}
                  placeholder="Tahun Ajar"
                  options={yearOptions}
                  value={selectedYear}
                  allowClear
                  onChange={(value) => setSelectedYear(value)}
                />
                <Select
                  style={{ minWidth: 200 }}
                  placeholder="Semester"
                  options={[
                    { label: "Semester Ganjil (1)", value: "1" },
                    { label: "Semester Genap (2)", value: "2" },
                  ]}
                  value={selectedSemester}
                  allowClear
                  onChange={(value) => setSelectedSemester(value)}
                />
                <Select
                  style={{ minWidth: 220 }}
                  placeholder="Kelas"
                  options={classOptions}
                  value={selectedClass}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={(value) => setSelectedClass(value)}
                />
                <Select
                  style={{ minWidth: 220 }}
                  placeholder="Guru"
                  options={teacherOptions}
                  value={selectedTeacher}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={(value) => setSelectedTeacher(value)}
                />
                <Select
                  style={{ minWidth: 180 }}
                  placeholder="Hari"
                  options={DAY_OPTIONS}
                  value={selectedDay}
                  allowClear
                  onChange={(value) => setSelectedDay(value)}
                />
                <Input
                  style={{ minWidth: 200 }}
                  placeholder="Cari mapel / kelas"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  allowClear
                />
                <Button onClick={handleClearFilters}>Reset</Button>
              </Space>
            </Space>
          </Card>

          <Card style={enterpriseCardStyle}>
            <Space
              align="center"
              style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}
            >
              <Space align="center">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigateCreate("schedules")}
                >
                  Tambah Jadwal
                </Button>
                <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>
                  Export PDF
                </Button>
              </Space>
              <Typography.Text type="secondary">
                Total jadwal: {displayedData.length} entri
              </Typography.Text>
            </Space>

            <Table<EnrichedSchedule>
              {...restTableProps}
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={displayedData}
              loading={isLoading}
              scroll={{ x: true }}
            />
          </Card>

          <Card
            style={enterpriseCardStyle}
            title={
              <Space>
                <CalendarOutlined />
                <span>
                  Jadwal Mingguan
                  {selectedClass ? ` · ${classMap.get(selectedClass)?.name ?? ""}` : ""}
                </span>
              </Space>
            }
          >
            {selectedClass ? (
              weeklyGrid && weeklyGrid.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            width: 140,
                            padding: 12,
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                            background: "#f8fafc",
                          }}
                        >
                          Jam
                        </th>
                        {WEEK_DAYS.map((day) => (
                          <th
                            key={day.value}
                            style={{
                              padding: 12,
                              textAlign: "center",
                              borderBottom: "1px solid #e2e8f0",
                              background: "#f8fafc",
                            }}
                          >
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyGrid.map((row) => (
                        <tr key={row.slotNumber}>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid #f1f5f9",
                              fontWeight: 600,
                            }}
                          >
                            <Space direction="vertical" size={2}>
                              <span>Jam {row.slotNumber}</span>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {row.timeLabel}
                              </Typography.Text>
                            </Space>
                          </td>
                          {row.cells.map((cell, index) => (
                            <td
                              key={`${row.slotNumber}-${index}`}
                              style={{
                                padding: 12,
                                minWidth: 160,
                                borderBottom: "1px solid #f1f5f9",
                                borderLeft: "1px solid #f8fafc",
                              }}
                            >
                              {cell ? (
                                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                  <Typography.Text strong>{cell.subjectName}</Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    {cell.teacherName}
                                  </Typography.Text>
                                  {cell.room ? (
                                    <Tag color="blue" style={{ width: "fit-content" }}>
                                      {cell.room}
                                    </Tag>
                                  ) : null}
                                </Space>
                              ) : (
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  Kosong
                                </Typography.Text>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty description="Belum ada jadwal untuk kelas ini" />
              )
            ) : (
              <Empty description="Pilih kelas untuk melihat jadwal mingguan" />
            )}
          </Card>
        </Space>
      </List>
    </ResourceActionGuard>
  );
};
