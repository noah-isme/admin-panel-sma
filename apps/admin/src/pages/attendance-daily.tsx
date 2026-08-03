import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Grid,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  useAttendanceSession,
  type AttendanceStudentRow,
  type AttendanceClassRecord,
  type AttendanceClassSubjectRecord,
  type AttendanceScheduleRecord,
} from "../hooks/use-attendance-session";
import { useDataProvider, useGetIdentity } from "@refinedev/core";
import type { IdentityPayload } from "../types/identity";
import { useAppNotification } from "../hooks/use-app-notification";

type StatusValue = "H" | "I" | "S" | "A";
type StatusOptionValue = StatusValue | null;

type RowState = {
  status: StatusOptionValue;
  note: string;
  existingId?: string;
  dirty: boolean;
};

const STATUS_DEFINITIONS: Array<{
  value: StatusOptionValue;
  label: string;
  icon: string;
  color: string;
  textColor: string;
  description: string;
}> = [
  {
    value: "H",
    label: "Hadir",
    icon: "✅",
    color: "#16a34a",
    textColor: "#ffffff",
    description: "Siswa hadir mengikuti pembelajaran.",
  },
  {
    value: "I",
    label: "Izin",
    icon: "📨",
    color: "#facc15",
    textColor: "#1f2937",
    description: "Izin resmi dengan keterangan tertulis.",
  },
  {
    value: "S",
    label: "Sakit",
    icon: "💊",
    color: "#fb923c",
    textColor: "#1f2937",
    description: "Sakit disertai keterangan.",
  },
  {
    value: "A",
    label: "Alfa",
    icon: "❌",
    color: "#ef4444",
    textColor: "#ffffff",
    description: "Tidak hadir tanpa keterangan resmi.",
  },
  {
    value: null,
    label: "Belum diisi",
    icon: "⏺️",
    color: "#94a3b8",
    textColor: "#0f172a",
    description: "Belum ada status, klik untuk mengubah.",
  },
];

const DATE_DISPLAY_FORMAT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_DISPLAY_FORMAT = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const requiresNote = (status: StatusOptionValue) => status === "I" || status === "S";

const toIsoDate = (value: Dayjs) => value.format("YYYY-MM-DD");

const StatusSelector: React.FC<{
  value: StatusOptionValue;
  onChange: (value: StatusOptionValue) => void;
}> = ({ value, onChange }) => {
  return (
    <Space wrap size={8}>
      {STATUS_DEFINITIONS.map((option) => {
        const isActive =
          (value === null && option.value === null) ||
          (option.value !== null && option.value === value);
        return (
          <Tooltip key={option.label} title={option.description}>
            <Button
              type={isActive ? "primary" : "default"}
              onClick={() => onChange(option.value)}
              style={{
                backgroundColor: isActive ? option.color : "#f1f5f9",
                color: isActive ? option.textColor : "#0f172a",
                borderColor: option.color,
                minWidth: 112,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontWeight: 600,
              }}
            >
              <span aria-hidden>{option.icon}</span>
              <span>{option.label}</span>
            </Button>
          </Tooltip>
        );
      })}
    </Space>
  );
};

const useClassesWithSchedule = (
  weekday: number,
  classSubjects: AttendanceClassSubjectRecord[],
  schedules: AttendanceScheduleRecord[]
) => {
  return useMemo(() => {
    if (!weekday) {
      return new Set<string>();
    }
    const map = new Map<string, AttendanceClassSubjectRecord>();
    classSubjects.forEach((mapping) => map.set(String(mapping.id), mapping));
    const set = new Set<string>();
    schedules.forEach((schedule) => {
      if (schedule.dayOfWeek !== weekday) return;
      const mapping = map.get(String(schedule.classSubjectId));
      if (mapping) {
        set.add(String(mapping.classroomId));
      }
    });
    return set;
  }, [classSubjects, schedules, weekday]);
};

export const AttendanceDailyPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [date, setDate] = useState<Dayjs>(dayjs());
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<number | undefined>();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  const [onlyActiveStudents, setOnlyActiveStudents] = useState(true);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [formState, setFormState] = useState<Record<string, RowState>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, setPendingVersion] = useState(0);

  const pendingIdsRef = useRef<Set<string>>(new Set());
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHydrationRef = useRef<boolean>(true);

  const { open: notify } = useAppNotification();
  // `useDataProvider` returns a *getter*, not the provider itself. Calling
  // `.update`/`.create`/`.custom` straight off it throws at runtime, so resolve
  // the default provider once here.
  const getDataProvider = useDataProvider();
  const dataProvider = useMemo(() => getDataProvider(), [getDataProvider]);
  const { data: identity } = useGetIdentity<IdentityPayload>();
  const weekday = ((date.day() + 6) % 7) + 1;

  const attendance = useAttendanceSession({
    date: toIsoDate(date),
    termId: selectedTermId,
    classId: selectedClassId,
    subjectId: selectedSubjectId,
    slot: selectedSlot,
    teacherId: selectedTeacherId,
  });

  const {
    terms,
    classes,
    sessions,
    activeTerm,
    activeSession,
    selectedClassId: resolvedClassId,
    rows,
  } = attendance;

  const schedulesData =
    (attendance.queries.schedulesQuery.data?.data as AttendanceScheduleRecord[]) ?? [];
  const classSubjectsData =
    (attendance.queries.classSubjectsQuery.data?.data as AttendanceClassSubjectRecord[]) ?? [];

  const classesWithSchedule = useClassesWithSchedule(weekday, classSubjectsData, schedulesData);

  const classOptions: AttendanceClassRecord[] = useMemo(() => {
    if (showAllClasses || classesWithSchedule.size === 0) {
      return classes;
    }
    const filtered = classes.filter((klass) => classesWithSchedule.has(String(klass.id)));
    return filtered.length > 0 ? filtered : classes;
  }, [classes, classesWithSchedule, showAllClasses]);

  const classMap = useMemo(() => {
    const map = new Map<string, AttendanceClassRecord>();
    classes.forEach((klass) => map.set(String(klass.id), klass));
    return map;
  }, [classes]);

  const subjectOptions = useMemo(() => {
    const unique = new Map<string, { label: string }>();
    sessions.forEach((session) => {
      if (!unique.has(session.subjectId)) {
        unique.set(session.subjectId, { label: session.subjectName });
      }
    });
    return Array.from(unique.entries()).map(([value, meta]) => ({
      label: meta.label,
      value,
    }));
  }, [sessions]);

  const slotOptions = useMemo(() => {
    const relevantSessions = sessions.filter((session) =>
      selectedSubjectId ? session.subjectId === selectedSubjectId : true
    );
    const unique = new Map<number, AttendanceScheduleRecord>();
    relevantSessions.forEach((session) => {
      if (!unique.has(session.slot)) {
        unique.set(session.slot, {
          ...session,
          classSubjectId: session.classSubjectId,
        } as unknown as AttendanceScheduleRecord);
      }
    });
    return Array.from(unique.values())
      .sort((a, b) => a.slot - b.slot)
      .map((session) => ({
        label: `Jam ke-${session.slot} (${session.startTime} - ${session.endTime})`,
        value: session.slot,
      }));
  }, [sessions, selectedSubjectId]);

  const teacherOptions = useMemo(() => {
    const unique = new Map<string, string>();
    sessions.forEach((session) => {
      if (!unique.has(session.teacherId)) {
        unique.set(session.teacherId, session.teacherName);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [sessions]);

  useEffect(() => {
    if (!selectedTermId && activeTerm?.id) {
      setSelectedTermId(activeTerm.id);
    }
  }, [activeTerm, selectedTermId]);

  useEffect(() => {
    if (!selectedClassId && resolvedClassId) {
      setSelectedClassId(resolvedClassId);
    }
  }, [resolvedClassId, selectedClassId]);

  useEffect(() => {
    if (!identity?.teacherId || selectedClassId) {
      return;
    }
    const homeroomClass = classes.find(
      (klass) => String(klass.homeroomId) === String(identity.teacherId)
    );
    if (homeroomClass) {
      setSelectedClassId(String(homeroomClass.id));
    }
  }, [classes, identity?.teacherId, selectedClassId]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    if (!selectedSubjectId) {
      setSelectedSubjectId(activeSession.subjectId);
    }
    if (typeof selectedSlot !== "number") {
      setSelectedSlot(activeSession.slot);
    }
    if (!selectedTeacherId) {
      setSelectedTeacherId(activeSession.teacherId);
    }
  }, [activeSession, selectedSubjectId, selectedSlot, selectedTeacherId]);

  const hydrateForm = useCallback(
    (nextRows: AttendanceStudentRow[]) => {
      const nextState: Record<string, RowState> = {};
      let latestUpdated: string | null = null;
      nextRows.forEach((row) => {
        const existing = row.existing;
        nextState[row.enrollmentId] = {
          status: existing?.status ?? null,
          note: existing?.note ?? "",
          existingId: existing?.id,
          dirty: false,
        };
        if (existing?.updatedAt) {
          if (!latestUpdated || existing.updatedAt > latestUpdated) {
            latestUpdated = existing.updatedAt;
          }
        }
      });
      setFormState(nextState);
      setLastSavedAt(latestUpdated);
      pendingIdsRef.current.clear();
      setPendingVersion((prev) => prev + 1);
    },
    [setFormState]
  );

  useEffect(() => {
    pendingHydrationRef.current = true;
    setFormState({});
    pendingIdsRef.current.clear();
    setPendingVersion((prev) => prev + 1);
  }, [attendance.date, resolvedClassId, activeSession?.classSubjectId]);

  useEffect(() => {
    if (!attendance.isFetching && pendingHydrationRef.current) {
      hydrateForm(rows);
      pendingHydrationRef.current = false;
    }
  }, [attendance.isFetching, hydrateForm, rows]);

  const updateRowState = useCallback(
    (enrollmentId: string, updater: (prev: RowState | undefined) => RowState) => {
      setFormState((prev) => {
        const next = updater(prev[enrollmentId]);
        return { ...prev, [enrollmentId]: next };
      });
      pendingIdsRef.current.add(enrollmentId);
      setPendingVersion((prev) => prev + 1);
    },
    []
  );

  const visibleRows = useMemo(() => {
    return rows.filter((row) => (onlyActiveStudents ? row.studentStatus === "active" : true));
  }, [onlyActiveStudents, rows]);

  const tableData = useMemo(
    () =>
      visibleRows.map((row, index) => ({
        index: index + 1,
        key: row.enrollmentId,
        ...row,
        state: formState[row.enrollmentId],
      })),
    [formState, visibleRows]
  );

  const pendingCount = pendingIdsRef.current.size;

  const ensureActiveSession = useCallback(() => {
    if (!selectedClassId || !activeSession) {
      notify?.({
        type: "warning",
        message: "Pilih kelas dan jadwal terlebih dahulu",
        description: "Pastikan kelas dan mata pelajaran untuk hari ini sudah dipilih.",
      });
      return false;
    }
    return true;
  }, [activeSession, notify, selectedClassId]);

  const resetFormState = useCallback(() => {
    hydrateForm(rows);
    pendingHydrationRef.current = false;
  }, [hydrateForm, rows]);

  const handleCancelChanges = useCallback(() => {
    resetFormState();
    setSaveState("idle");
    setSaveError(null);
  }, [resetFormState]);

  const handleSave = useCallback(
    async (targetIds?: string[], options?: { silent?: boolean }) => {
      if (!ensureActiveSession()) {
        return;
      }

      const ids =
        targetIds && targetIds.length > 0
          ? targetIds
          : Object.entries(formState)
              .filter(([, state]) => state.dirty)
              .map(([enrollmentId]) => enrollmentId);

      if (ids.length === 0) {
        return;
      }

      const invalidRows = ids.filter((enrollmentId) => {
        const state = formState[enrollmentId];
        if (!state) return true;
        if (state.status === null) return true;
        if (requiresNote(state.status) && state.note.trim().length === 0) {
          return true;
        }
        return false;
      });

      if (invalidRows.length > 0) {
        setSaveState("error");
        setSaveError("Lengkapi status dan keterangan sebelum menyimpan.");
        notify?.({
          type: "error",
          message: "Validasi absensi gagal",
          description:
            "Pastikan seluruh siswa memiliki status, dan alasan diisi untuk status izin atau sakit.",
        });
        return;
      }

      setSaveError(null);
      setSaveState("saving");
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      try {
        const payloads = ids.map((enrollmentId) => {
          const state = formState[enrollmentId];
          return {
            enrollmentId,
            state,
          };
        });

        await Promise.all(
          payloads.map(async ({ enrollmentId, state }) => {
            const values = {
              enrollmentId,
              classId: selectedClassId,
              date: attendance.date,
              status: state.status,
              note: state.note.trim() || undefined,
              sessionType: "Mapel",
              subjectId: activeSession?.subjectId,
              teacherId: activeSession?.teacherId,
              slot: activeSession?.slot,
            };

            if (state.existingId) {
              await dataProvider.update({
                resource: "attendance",
                id: state.existingId,
                variables: values,
              });
            } else {
              await dataProvider.create({
                resource: "attendance",
                variables: values,
              });
            }
          })
        );

        pendingIdsRef.current.forEach((id) => {
          if (!ids.includes(id)) return;
          pendingIdsRef.current.delete(id);
        });
        setPendingVersion((prev) => prev + 1);

        pendingHydrationRef.current = true;
        await attendance.queries.attendanceQuery.refetch?.();

        setSaveState("idle");
        const nowIso = new Date().toISOString();
        setLastSavedAt(nowIso);

        if (!options?.silent) {
          const className = classMap.get(String(selectedClassId))?.name ?? "Kelas";
          notify?.({
            type: "success",
            message: `Absensi ${className} tersimpan`,
            description: activeSession
              ? `Jam ke-${activeSession.slot} · ${activeSession.subjectName}`
              : undefined,
          });
        }
      } catch (error) {
        setSaveState("error");
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan absensi.";
        setSaveError(message);
        notify?.({
          type: "error",
          message: "Gagal menyimpan absensi",
          description: message,
        });
      }
    },
    [
      activeSession,
      attendance.date,
      attendance.queries.attendanceQuery,
      classMap,
      dataProvider,
      ensureActiveSession,
      formState,
      notify,
      selectedClassId,
    ]
  );

  const queueAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void handleSave(Array.from(pendingIdsRef.current), { silent: true });
    }, 3000);
  }, [handleSave]);

  const handleStatusChange = useCallback(
    (enrollmentId: string, nextValue: StatusOptionValue) => {
      updateRowState(enrollmentId, (prev) => ({
        status: nextValue,
        note: prev?.note ?? "",
        existingId: prev?.existingId,
        dirty: true,
      }));
      queueAutoSave();
    },
    [queueAutoSave, updateRowState]
  );

  const handleNoteChange = useCallback(
    (enrollmentId: string, note: string) => {
      updateRowState(enrollmentId, (prev) => ({
        status: prev?.status ?? null,
        note,
        existingId: prev?.existingId,
        dirty: true,
      }));
      queueAutoSave();
    },
    [queueAutoSave, updateRowState]
  );

  const handleMarkAllPresent = useCallback(() => {
    if (!ensureActiveSession()) {
      return;
    }
    visibleRows.forEach((row) => {
      updateRowState(row.enrollmentId, (prev) => ({
        status: "H",
        note: "",
        existingId: prev?.existingId,
        dirty: true,
      }));
      pendingIdsRef.current.add(row.enrollmentId);
    });
    setPendingVersion((prev) => prev + 1);
    queueAutoSave();
    notify?.({
      type: "info",
      message: "Semua siswa ditandai hadir",
      description: "Silakan ubah status siswa tertentu bila ada izin atau sakit.",
    });
  }, [ensureActiveSession, notify, queueAutoSave, updateRowState, visibleRows]);

  useEffect(() => {
    // Update auto-save callback dependency after definition
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [handleSave]);

  const columns: ColumnsType<(typeof tableData)[number]> = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "index",
        width: 64,
        align: "center" as const,
        render: (value: number) => (
          <Typography.Text strong style={{ color: "#1f2937" }}>
            {value}
          </Typography.Text>
        ),
      },
      {
        title: "Nama Siswa",
        dataIndex: "studentName",
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {record.studentNis}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "state",
        width: isMobile ? 240 : 360,
        render: (state: RowState | undefined, record) => (
          <StatusSelector
            value={state?.status ?? null}
            onChange={(next) => handleStatusChange(record.enrollmentId, next)}
          />
        ),
      },
      {
        title: "Keterangan",
        dataIndex: "state",
        width: 220,
        render: (state: RowState | undefined, record) => {
          const value = state?.note ?? "";
          const statusValue = state?.status ?? null;
          const showError = requiresNote(statusValue) && value.trim().length === 0;
          return (
            <Input
              placeholder="Alasan / catatan"
              value={value}
              onChange={(event) => handleNoteChange(record.enrollmentId, event.target.value)}
              status={showError ? "error" : undefined}
            />
          );
        },
      },
    ],
    [handleNoteChange, handleStatusChange, isMobile]
  );

  const autoSaveIndicator = useMemo<ReactNode>(() => {
    if (saveState === "saving") {
      return (
        <Tag color="blue" icon={<ReloadOutlined spin />}>
          Menyimpan perubahan...
        </Tag>
      );
    }
    if (saveState === "error") {
      return (
        <Tag color="red" icon={<StopOutlined />}>
          Gagal menyimpan
        </Tag>
      );
    }
    if (pendingCount > 0) {
      return (
        <Tag color="gold" icon={<ReloadOutlined />}>
          {pendingCount} perubahan belum disimpan
        </Tag>
      );
    }
    if (lastSavedAt) {
      return (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          {`Tersimpan ${SHORT_DATE_FORMAT.format(new Date(lastSavedAt))} ${TIME_DISPLAY_FORMAT.format(new Date(lastSavedAt))}`}
        </Tag>
      );
    }
    return <Tag color="default">Menunggu input...</Tag>;
  }, [lastSavedAt, pendingCount, saveState]);

  const enterpriseCardStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    boxShadow: "none",
    borderRadius: 6,
  };

  const activeClassName = selectedClassId ? classMap.get(String(selectedClassId))?.name : undefined;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Absensi Pembelajaran Harian
        </Typography.Title>
        <Typography.Text type="secondary">
          Input absensi cepat & terintegrasi langsung dengan jadwal dan laporan sekolah.
        </Typography.Text>
      </Space>

      <Card style={enterpriseCardStyle}>
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          size={isMobile ? 12 : 16}
          style={{ width: "100%", flexWrap: "wrap" }}
        >
          <Space direction="vertical" size={4}>
            <Typography.Text strong>
              Filter Hari Ini · {DATE_DISPLAY_FORMAT.format(date.toDate())}
            </Typography.Text>
            <DatePicker
              value={date}
              onChange={(value) => value && setDate(value)}
              format="DD MMMM YYYY"
              style={{ minWidth: 180 }}
            />
          </Space>

          <Select
            placeholder="Tahun Ajar"
            style={{ minWidth: 180 }}
            value={selectedTermId}
            onChange={(value) => setSelectedTermId(value)}
            options={terms.map((term) => ({
              value: term.id,
              label: term.name,
            }))}
          />

          <Select
            placeholder="Kelas"
            style={{ minWidth: 200 }}
            value={selectedClassId}
            onChange={(value) => setSelectedClassId(value)}
            options={classOptions.map((klass) => ({
              value: klass.id,
              label: klass.name,
            }))}
          />

          <Select
            placeholder="Mata Pelajaran"
            style={{ minWidth: 200 }}
            value={selectedSubjectId}
            onChange={(value) => setSelectedSubjectId(value)}
            options={subjectOptions}
            allowClear
          />

          <Select
            placeholder="Jam ke"
            style={{ minWidth: 180 }}
            value={selectedSlot}
            onChange={(value) => setSelectedSlot(value)}
            options={slotOptions}
            allowClear
          />

          <Select
            placeholder="Guru"
            style={{ minWidth: 200 }}
            value={selectedTeacherId}
            onChange={(value) => setSelectedTeacherId(value)}
            options={teacherOptions}
            allowClear
          />
        </Space>

        <Divider style={{ margin: "16px 0" }} />

        <Space size={16} wrap>
          <Checkbox
            checked={onlyActiveStudents}
            onChange={(event) => setOnlyActiveStudents(event.target.checked)}
          >
            Hanya siswa aktif
          </Checkbox>
          <Checkbox
            checked={showAllClasses}
            onChange={(event) => setShowAllClasses(event.target.checked)}
          >
            Tampilkan semua kelas
          </Checkbox>
        </Space>
      </Card>

      <Card style={enterpriseCardStyle}>
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
          size={isMobile ? 12 : 16}
        >
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {activeClassName ?? "Pilih kelas"} ·{" "}
              {activeSession ? `Jam ke-${activeSession.slot}` : "Belum ada jadwal"}
            </Typography.Title>
            <Space size={8} wrap>
              <Tag icon={<FieldTimeOutlined />} color="blue">
                {activeSession
                  ? `${activeSession.startTime} - ${activeSession.endTime}`
                  : "00:00 - 00:00"}
              </Tag>
              <Tag icon={<CalendarOutlined />} color="purple">
                {activeSession ? activeSession.subjectName : "Pilih mapel"}
              </Tag>
              <Tag icon={<UserOutlined />} color="green">
                {activeSession ? activeSession.teacherName : "Pilih guru"}
              </Tag>
              <Tag icon={<TeamOutlined />} color="default">
                {visibleRows.length} siswa
              </Tag>
            </Space>
          </Space>

          <Space size={8} wrap>
            <Tooltip title="Tandai semua siswa hadir">
              <Button icon={<CheckCircleOutlined />} onClick={handleMarkAllPresent}>
                Tandai semua hadir
              </Button>
            </Tooltip>
            <Tooltip title="Batalkan perubahan yang belum disimpan">
              <Button icon={<UndoOutlined />} onClick={handleCancelChanges}>
                Batal
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => void handleSave()}
              disabled={pendingCount === 0}
              loading={saveState === "saving"}
            >
              Simpan
            </Button>
          </Space>
        </Space>

        <Divider style={{ margin: "16px 0" }} />

        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}
          size={isMobile ? 8 : 12}
        >
          <Typography.Text type="secondary">
            Status auto-save aktif · perubahan otomatis disimpan setelah 3 detik.
          </Typography.Text>
          {autoSaveIndicator}
        </Space>

        {saveError ? (
          <Typography.Text type="danger" style={{ display: "block", marginTop: 8 }}>
            {saveError}
          </Typography.Text>
        ) : null}

        <Divider style={{ margin: "16px 0" }} />

        <Spin spinning={attendance.isFetching && tableData.length === 0}>
          <Table
            rowKey="key"
            size="small"
            dataSource={tableData}
            columns={columns}
            pagination={false}
            scroll={{ x: isMobile ? 720 : undefined }}
            locale={{
              emptyText: attendance.isLoading
                ? "Memuat data..."
                : "Belum ada data absensi untuk filter ini.",
            }}
          />
        </Spin>
      </Card>
    </Space>
  );
};
