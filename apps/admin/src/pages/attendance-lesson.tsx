import { useList } from "../hooks/use-refine-list";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { RadioChangeEvent } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useDataProvider, useGetIdentity, useTranslate, type BaseRecord } from "@refinedev/core";
import type { IdentityPayload } from "../types/identity";
import { useAppNotification } from "../hooks/use-app-notification";
import { downloadAuthenticatedFile } from "../utils/download";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { usePersistentSelection } from "../hooks/use-persistent-selection";
import { DownloadOutlined } from "@ant-design/icons";

type AttendanceStatus = "H" | "S" | "I" | "A";

type LessonAttendanceState = Record<
  string,
  {
    status: AttendanceStatus | null;
    note: string;
  }
>;

type AttendanceRecord = {
  id: string;
  enrollmentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  sessionType?: string;
  subjectId?: string;
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "H", label: "Hadir", color: "green" },
  { value: "S", label: "Sakit", color: "blue" },
  { value: "I", label: "Izin", color: "orange" },
  { value: "A", label: "Alpa", color: "red" },
];

const DATE_FORMAT = "YYYY-MM-DD";

export const AttendanceLessonPage: React.FC = () => {
  const { value: storedMapping, setValue: setStoredMapping } = usePersistentSelection<
    string | undefined
  >("lesson-class-subject");
  const [classSubjectId, setClassSubjectId] = useState<string | undefined>(storedMapping);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [formState, setFormState] = useState<LessonAttendanceState>({});
  const [submitting, setSubmitting] = useState(false);

  // `useDataProvider` returns a *getter*, not the provider itself. Calling
  // `.update`/`.create`/`.custom` straight off it throws at runtime, so resolve
  // the default provider once here.
  const getDataProvider = useDataProvider();
  const dataProvider = useMemo(() => getDataProvider(), [getDataProvider]);
  const { open: notify } = useAppNotification();
  const t = useTranslate();

  const migratedClassSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classSubjectsQuery = {
    ...migratedClassSubjectsQuery.result,
    ...migratedClassSubjectsQuery.query,
    ...migratedClassSubjectsQuery,
  };

  const migratedClassesQuery = useList({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const migratedSubjectsQuery = useList({
    resource: "subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const subjectsQuery = {
    ...migratedSubjectsQuery.result,
    ...migratedSubjectsQuery.query,
    ...migratedSubjectsQuery,
  };

  const migratedTeachersQuery = useList({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const teachersQuery = {
    ...migratedTeachersQuery.result,
    ...migratedTeachersQuery.query,
    ...migratedTeachersQuery,
  };

  const migratedEnrollmentsQuery = useList({
    resource: "enrollments",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const enrollmentsQuery = {
    ...migratedEnrollmentsQuery.result,
    ...migratedEnrollmentsQuery.query,
    ...migratedEnrollmentsQuery,
  };

  const migratedStudentsQuery = useList({
    resource: "students",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const studentsQuery = {
    ...migratedStudentsQuery.result,
    ...migratedStudentsQuery.query,
    ...migratedStudentsQuery,
  };

  const migratedAttendanceQuery = useList({
    resource: "attendance",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const attendanceQuery = {
    ...migratedAttendanceQuery.result,
    ...migratedAttendanceQuery.query,
    ...migratedAttendanceQuery,
  };

  const { data: identity } = useGetIdentity<IdentityPayload>();
  const teacherId = identity?.teacherId;

  const classSubjects = (classSubjectsQuery.data?.data as BaseRecord[]) ?? [];
  const classes = (classesQuery.data?.data as BaseRecord[]) ?? [];
  const subjects = (subjectsQuery.data?.data as BaseRecord[]) ?? [];
  const teachers = (teachersQuery.data?.data as BaseRecord[]) ?? [];
  const enrollments = (enrollmentsQuery.data?.data as BaseRecord[]) ?? [];
  const students = (studentsQuery.data?.data as BaseRecord[]) ?? [];
  const attendanceRecords = (attendanceQuery.data?.data as AttendanceRecord[]) ?? [];

  const selectedMapping = useMemo(
    () => classSubjects.find((mapping) => String(mapping.id) === classSubjectId),
    [classSubjectId, classSubjects]
  );

  const classEnrollments = useMemo(() => {
    if (!selectedMapping) return [];
    return enrollments.filter((enrollment) => enrollment.classId === selectedMapping.classroomId);
  }, [selectedMapping, enrollments]);

  const studentDictionary = useMemo(() => {
    const map = new Map<string, BaseRecord>();
    students.forEach((student) => map.set(String(student.id), student));
    return map;
  }, [students]);

  const existingAttendance = useMemo(() => {
    if (!selectedMapping) return new Map<string, AttendanceRecord>();
    const targetDate = date.format(DATE_FORMAT);
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords
      .filter(
        (record) =>
          record.sessionType === "Mapel" &&
          record.date === targetDate &&
          record.subjectId === selectedMapping.subjectId
      )
      .forEach((record) => {
        map.set(record.enrollmentId, record);
      });
    return map;
  }, [attendanceRecords, date, selectedMapping]);

  const effectiveRows = useMemo(() => {
    return classEnrollments
      .map((enrollment) => {
        const student = studentDictionary.get(String(enrollment.studentId));
        if (!student) return null;

        return {
          enrollmentId: String(enrollment.id),
          studentId: String(enrollment.studentId),
          studentName: student.fullName ?? student.name ?? `ID ${student.id}`,
          existing: existingAttendance.get(String(enrollment.id)),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [classEnrollments, existingAttendance, studentDictionary]);

  useEffect(() => {
    const next: LessonAttendanceState = {};
    effectiveRows.forEach((row) => {
      const existing = existingAttendance.get(row.enrollmentId);
      next[row.enrollmentId] = {
        status: existing?.status ?? null,
        note: existing?.note ?? "",
      };
    });
    setFormState(next);
  }, [effectiveRows, existingAttendance]);

  useEffect(() => {
    if (classSubjectId !== storedMapping) {
      setStoredMapping(classSubjectId);
    }
  }, [classSubjectId, storedMapping, setStoredMapping]);

  useEffect(() => {
    if (!classSubjectId && storedMapping) {
      setClassSubjectId(storedMapping);
    }
  }, [classSubjectId, storedMapping]);

  useEffect(() => {
    if (!classSubjectId && teacherId) {
      const teacherMappings = classSubjects.filter(
        (mapping) => String(mapping.teacherId) === String(teacherId)
      );
      if (teacherMappings.length === 1) {
        setClassSubjectId(String(teacherMappings[0].id));
      }
    }
  }, [classSubjectId, classSubjects, teacherId]);

  const handleStatusChange = (enrollmentId: string, event: RadioChangeEvent) => {
    const value = event.target.value as AttendanceStatus;
    setFormState((prev) => ({
      ...prev,
      [enrollmentId]: { status: value, note: prev[enrollmentId]?.note ?? "" },
    }));
  };

  const handleNoteChange = (enrollmentId: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [enrollmentId]: { status: prev[enrollmentId]?.status ?? null, note: value },
    }));
  };

  const validateBeforeSubmit = () => {
    const missing: string[] = [];
    const notesNeeded: string[] = [];

    effectiveRows.forEach((row) => {
      const state = formState[row.enrollmentId];
      if (!state || !state.status) {
        missing.push(row.studentName);
      } else if ((state.status === "S" || state.status === "I") && !state.note.trim()) {
        notesNeeded.push(row.studentName);
      }
    });

    if (missing.length > 0) {
      notify?.({
        type: "warning",
        message: "Lengkapi status absensi",
        description: `Masih ada siswa tanpa status: ${missing.join(", ")}`,
      });
      return false;
    }

    if (notesNeeded.length > 0) {
      notify?.({
        type: "warning",
        message: "Catatan wajib untuk Sakit/Izin",
        description: notesNeeded.join(", "),
      });
      return false;
    }

    return true;
  };

  const historyRecords = useMemo(() => {
    if (!selectedMapping) return [];
    return attendanceRecords.filter((record) => {
      if (record.sessionType !== "Mapel") return false;
      if (record.subjectId !== selectedMapping.subjectId) return false;
      const recordDate = dayjs(record.date);
      // `isSameOrBefore` comes from a dayjs plugin that was never registered, so
      // this threw at runtime. `!isAfter` is the same comparison on core dayjs.
      return !recordDate.isAfter(date) && recordDate.isAfter(date.clone().subtract(7, "day"));
    });
  }, [attendanceRecords, date, selectedMapping]);

  const historySummary = useMemo(() => {
    const summary = new Map<AttendanceStatus, number>();
    historyRecords.forEach((record) => {
      summary.set(record.status, (summary.get(record.status) ?? 0) + 1);
    });
    return STATUS_OPTIONS.map((option) => ({
      ...option,
      count: summary.get(option.value) ?? 0,
    }));
  }, [historyRecords]);

  const warningStudents = useMemo(() => {
    const counter = new Map<string, number>();
    historyRecords.forEach((record) => {
      if (record.status === "A") {
        counter.set(record.enrollmentId, (counter.get(record.enrollmentId) ?? 0) + 1);
      }
    });
    return effectiveRows
      .filter((row) => (counter.get(row.enrollmentId) ?? 0) >= 2)
      .map((row) => row.studentName);
  }, [effectiveRows, historyRecords]);

  const handleSubmit = async () => {
    if (!selectedMapping) {
      notify?.({
        type: "warning",
        message: "Pilih mapel & kelas terlebih dahulu",
      });
      return;
    }
    if (!validateBeforeSubmit()) {
      return;
    }

    const targetDate = date.format(DATE_FORMAT);

    try {
      setSubmitting(true);
      await Promise.all(
        effectiveRows.map((row) => {
          const payload = formState[row.enrollmentId];
          if (!payload || !payload.status) return Promise.resolve();

          const existing = existingAttendance.get(row.enrollmentId);
          const values = {
            enrollmentId: row.enrollmentId,
            date: targetDate,
            status: payload.status,
            note: payload.note.trim() || undefined,
            sessionType: "Mapel",
            subjectId: selectedMapping.subjectId,
            teacherId: selectedMapping.teacherId,
          };

          if (existing) {
            return dataProvider.update({
              resource: "attendance",
              id: existing.id,
              variables: values,
            });
          }

          return dataProvider.create({
            resource: "attendance",
            variables: values,
          });
        })
      );

      notify?.({
        type: "success",
        message: "Absensi mapel disimpan",
        description: STATUS_OPTIONS.map((option) => {
          const count = effectiveRows.filter(
            (row) => formState[row.enrollmentId]?.status === option.value
          ).length;
          return `${option.label}: ${count}`;
        }).join(" · "),
      });
      await attendanceQuery.refetch?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menyimpan absensi mapel",
        description:
          error instanceof Error ? error.message : t("errors.httpError", "Terjadi kesalahan."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Nama Siswa",
      dataIndex: "studentName",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (_: unknown, record: (typeof effectiveRows)[number]) => (
        <Radio.Group
          value={formState[record.enrollmentId]?.status ?? null}
          onChange={(event) => handleStatusChange(record.enrollmentId, event)}
        >
          {STATUS_OPTIONS.map((option) => (
            <Radio.Button key={option.value} value={option.value}>
              <Tag color={option.color} style={{ marginRight: 0 }}>
                {option.label}
              </Tag>
            </Radio.Button>
          ))}
        </Radio.Group>
      ),
    },
    {
      title: "Catatan",
      dataIndex: "note",
      width: 260,
      render: (_: unknown, record: (typeof effectiveRows)[number]) => {
        const status = formState[record.enrollmentId]?.status;
        return (
          <Input.TextArea
            allowClear
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={formState[record.enrollmentId]?.note ?? ""}
            onChange={(event) => handleNoteChange(record.enrollmentId, event.target.value)}
            placeholder={
              status === "S" || status === "I" ? "Wajib isi alasan untuk Sakit/Izin" : "Opsional"
            }
          />
        );
      },
    },
    {
      title: "Riwayat",
      dataIndex: "existing",
      render: (existing: AttendanceRecord | undefined) =>
        existing ? (
          <Space direction="vertical" size={4}>
            <Tag
              color={
                STATUS_OPTIONS.find((item) => item.value === existing.status)?.color ?? undefined
              }
            >
              {STATUS_OPTIONS.find((item) => item.value === existing.status)?.label ??
                existing.status}
            </Tag>
            {existing.note ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {existing.note}
              </Typography.Text>
            ) : null}
          </Space>
        ) : (
          <Typography.Text type="secondary">Belum ada</Typography.Text>
        ),
    },
  ];

  const downloadCsv = () => {
    if (!selectedMapping) return;
    const dateTo = date.format(DATE_FORMAT);
    const dateFrom = date.clone().subtract(6, "day").format(DATE_FORMAT);
    void downloadAuthenticatedFile({
      url: "/export/attendance",
      params: {
        classId: selectedMapping.classroomId,
        date_from: dateFrom,
        date_to: dateTo,
      },
      filename: `attendance-${dateFrom}-${dateTo}.csv`,
    }).catch(() => {
      notify?.({
        type: "error",
        message: "Export CSV absensi gagal",
        description: "Periksa koneksi atau coba lagi setelah beberapa saat.",
      });
    });
  };

  return (
    <ResourceActionGuard action="create" resourceName="attendance">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Absensi Per Mapel Guru
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Catat kehadiran siswa untuk sesi pembelajaran tertentu. Status Sakit/Izin wajib disertai
            catatan singkat.
          </Typography.Paragraph>
          <Card>
            <Form layout="inline">
              <Form.Item label="Mapel" required>
                <Select
                  showSearch
                  placeholder="Pilih mapel & kelas"
                  style={{ minWidth: 320 }}
                  value={classSubjectId}
                  onChange={(value) => setClassSubjectId(value)}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={classSubjects.map((mapping) => {
                    const cls = classes.find((item) => item.id === mapping.classroomId);
                    const subject = subjects.find((item) => item.id === mapping.subjectId);
                    const teacher = teachers.find((item) => item.id === mapping.teacherId);
                    return {
                      value: String(mapping.id),
                      label: `${subject?.name ?? "Mapel"} · ${cls?.name ?? "Kelas"}${
                        teacher ? ` · ${teacher.fullName}` : ""
                      }`,
                    };
                  })}
                />
              </Form.Item>
              <Form.Item label="Tanggal" required>
                <DatePicker value={date} onChange={(value) => value && setDate(value)} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!classSubjectId}
                >
                  Simpan Absensi Mapel
                </Button>
              </Form.Item>
            </Form>
          </Card>
          {!classSubjectId ? (
            <Alert
              type="info"
              showIcon
              message="Pilih mapel terlebih dahulu untuk mengisi absensi."
              style={{ marginBottom: 0 }}
            />
          ) : (
            <Card>
              {warningStudents.length > 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Perhatian"
                  description={`Siswa dengan catatan alpa ≥ 2 kali pada mapel ini: ${warningStudents.join(
                    ", "
                  )}`}
                  style={{ marginBottom: 16 }}
                />
              ) : null}
              <Table
                size="small"
                dataSource={effectiveRows}
                columns={columns}
                rowKey={(record) => record.enrollmentId}
                pagination={false}
                locale={{
                  emptyText: "Tidak ada siswa pada kelas ini.",
                }}
              />
              <Space style={{ marginTop: 16 }}>
                {historySummary.map((item) => (
                  <Tag key={item.value} color={item.count > 0 ? item.color : undefined}>
                    {item.label}: {item.count}
                  </Tag>
                ))}
                <Button icon={<DownloadOutlined />} onClick={downloadCsv}>
                  Unduh CSV 7 Hari Terakhir
                </Button>
              </Space>
            </Card>
          )}
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
