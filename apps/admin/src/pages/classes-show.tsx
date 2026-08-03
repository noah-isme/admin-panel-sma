import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Empty,
  Popconfirm,
  Result,
  Segmented,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  useDelete,
  useList,
  useMany,
  useNavigation,
  useOne,
  useShow,
  type CrudFilter,
} from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import dayjs from "dayjs";
import { ResourceActionGuard } from "../components/resource-action-guard";

type ClassRecord = {
  id: string;
  code?: string;
  name: string;
  homeroomId?: string | null;
  termId?: string | null;
  capacity?: number;
};

type TermRecord = {
  id: string;
  name: string;
  year: string;
  semester: number;
};

type TeacherRecord = {
  id: string;
  fullName: string;
};

type EnrollmentRecord = {
  id: string;
  studentId: string;
  classId: string;
  termId?: string | null;
};

type StudentRecord = {
  id: string;
  nis: string;
  fullName: string;
  gender?: "M" | "F";
  status?: "active" | "inactive";
};

type ClassSubjectRecord = {
  id: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  termId?: string | null;
};

type SubjectRecord = {
  id: string;
  name: string;
};

type ScheduleRecord = {
  id: string;
  classSubjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
};

type MemberRow = {
  enrollmentId: string;
  studentId: string;
  order: number;
  nis?: string;
  fullName?: string;
  gender?: "M" | "F";
  status?: "active" | "inactive";
};

type ScheduleRow = {
  id: string;
  classSubjectId: string;
  dayOfWeek: number;
  dayLabel: string;
  periodLabel?: string;
  startTime: string;
  endTime: string;
  subjectName?: string;
  subjectId?: string;
  teacherName?: string;
  teacherId?: string;
  room?: string;
};

const DAY_OPTIONS = [
  { label: "Senin", value: "1" },
  { label: "Selasa", value: "2" },
  { label: "Rabu", value: "3" },
  { label: "Kamis", value: "4" },
  { label: "Jumat", value: "5" },
  { label: "Sabtu", value: "6" },
] as const;

const resolveDayLabel = (value: number) => {
  const found = DAY_OPTIONS.find((day) => Number(day.value) === value);
  return found ? found.label : `Hari ${value}`;
};

const resolvePeriodLabel = (startTime: string | undefined) => {
  if (!startTime) return undefined;
  const slots = ["07:00", "07:50", "08:40", "09:40", "10:30", "11:20", "12:45", "13:35"];
  const index = slots.indexOf(startTime.slice(0, 5));
  return index >= 0 ? String(index + 1) : undefined;
};

const formatGender = (value?: "M" | "F") => {
  if (value === "M") return "L";
  if (value === "F") return "P";
  return "-";
};

const buildTermLabel = (term?: TermRecord) => {
  if (!term) return "-";
  return `${term.year}/${term.semester}`;
};

export const ClassesShow: React.FC = () => {
  const { edit, create, show, list } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteEnrollment } = useDelete();

  const { queryResult: classQuery } = useShow<ClassRecord>({
    resource: "classes",
  });

  const classRecord = classQuery?.data?.data;
  const classId = classRecord?.id;
  const termId = classRecord?.termId ?? null;
  const homeroomId = classRecord?.homeroomId ?? null;

  const { data: termQuery } = useOne<TermRecord>({
    resource: "terms",
    id: termId ?? "",
    queryOptions: { enabled: Boolean(termId) },
  });
  const termRecord = termQuery?.data;

  const { data: homeroomQuery } = useOne<TeacherRecord>({
    resource: "teachers",
    id: homeroomId ?? "",
    queryOptions: { enabled: Boolean(homeroomId) },
  });
  const homeroomTeacher = homeroomQuery?.data;

  const enrollmentFilters: CrudFilter[] | undefined = useMemo(() => {
    if (!classId) return undefined;
    const filters: CrudFilter[] = [{ field: "classId", operator: "eq", value: classId }];
    if (termId) {
      filters.push({ field: "termId", operator: "eq", value: termId });
    }
    return filters;
  }, [classId, termId]);

  const enrollmentsQuery = useList<EnrollmentRecord>({
    resource: "enrollments",
    filters: enrollmentFilters,
    pagination: { current: 1, pageSize: 500 },
    queryOptions: {
      enabled: Boolean(classId),
      keepPreviousData: true,
    },
  });
  const enrollmentRecords = (enrollmentsQuery.data?.data ?? []) as EnrollmentRecord[];

  const studentIds = useMemo(
    () =>
      Array.from(
        new Set(
          enrollmentRecords
            .map((enrollment) => enrollment.studentId)
            .filter((value): value is string => Boolean(value && value.length > 0))
        )
      ),
    [enrollmentRecords]
  );

  const studentsQuery = useMany<StudentRecord>({
    resource: "students",
    ids: studentIds,
    queryOptions: {
      enabled: studentIds.length > 0,
      keepPreviousData: true,
    },
  });

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    (studentsQuery.data?.data ?? []).forEach((student) => {
      map.set(student.id, student);
    });
    return map;
  }, [studentsQuery.data?.data]);

  const memberRows: MemberRow[] = useMemo(() => {
    const rows = enrollmentRecords.map((enrollment) => {
      const student = studentMap.get(enrollment.studentId);
      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        order: 0,
        nis: student?.nis,
        fullName: student?.fullName,
        gender: student?.gender,
        status: student?.status,
      };
    });

    const sorted = rows.sort((a, b) => {
      const nameA = a.fullName ?? "";
      const nameB = b.fullName ?? "";
      return nameA.localeCompare(nameB, "id-ID");
    });

    return sorted.map((row, index) => ({ ...row, order: index + 1 }));
  }, [enrollmentRecords, studentMap]);

  const classSubjectsQuery = useList<ClassSubjectRecord>({
    resource: "class-subjects",
    filters:
      classId !== undefined
        ? ([{ field: "classroomId", operator: "eq", value: classId }] as CrudFilter[])
        : undefined,
    pagination: { current: 1, pageSize: 300 },
    queryOptions: {
      enabled: Boolean(classId),
      keepPreviousData: true,
    },
  });

  const classSubjects = (classSubjectsQuery.data?.data ?? []) as ClassSubjectRecord[];

  const classSubjectIds = useMemo(() => classSubjects.map((item) => item.id), [classSubjects]);

  const schedulesQuery = useList<ScheduleRecord>({
    resource: "schedules",
    pagination: { current: 1, pageSize: 500 },
    queryOptions: {
      enabled: classSubjectIds.length > 0,
      keepPreviousData: true,
    },
  });

  const teacherIds = useMemo(
    () =>
      Array.from(
        new Set(
          classSubjects
            .map((subject) => subject.teacherId)
            .filter((value): value is string => Boolean(value && value.length > 0))
        )
      ),
    [classSubjects]
  );

  const subjectIds = useMemo(
    () =>
      Array.from(
        new Set(
          classSubjects
            .map((subject) => subject.subjectId)
            .filter((value): value is string => Boolean(value && value.length > 0))
        )
      ),
    [classSubjects]
  );

  const teachersMany = useMany<TeacherRecord>({
    resource: "teachers",
    ids: teacherIds,
    queryOptions: {
      enabled: teacherIds.length > 0,
      keepPreviousData: true,
    },
  });

  const subjectsMany = useMany<SubjectRecord>({
    resource: "subjects",
    ids: subjectIds,
    queryOptions: {
      enabled: subjectIds.length > 0,
      keepPreviousData: true,
    },
  });

  const teacherMap = useMemo(() => {
    const map = new Map<string, TeacherRecord>();
    (teachersMany.data?.data ?? []).forEach((teacher) => {
      map.set(teacher.id, teacher);
    });
    if (homeroomTeacher) {
      map.set(homeroomTeacher.id, homeroomTeacher);
    }
    return map;
  }, [homeroomTeacher, teachersMany.data?.data]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, SubjectRecord>();
    (subjectsMany.data?.data ?? []).forEach((subject) => {
      map.set(subject.id, subject);
    });
    return map;
  }, [subjectsMany.data?.data]);

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    const schedules = (schedulesQuery.data?.data ?? []) as ScheduleRecord[];
    return schedules
      .filter((schedule) => classSubjectIds.includes(schedule.classSubjectId))
      .map((schedule) => {
        const relation = classSubjects.find((item) => item.id === schedule.classSubjectId);
        const teacher = relation ? teacherMap.get(relation.teacherId) : undefined;
        const subject = relation ? subjectMap.get(relation.subjectId) : undefined;
        return {
          id: schedule.id,
          classSubjectId: schedule.classSubjectId,
          dayOfWeek: schedule.dayOfWeek,
          dayLabel: resolveDayLabel(schedule.dayOfWeek),
          periodLabel: resolvePeriodLabel(schedule.startTime),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          subjectName: subject?.name,
          subjectId: subject?.id,
          teacherName: teacher?.fullName,
          teacherId: teacher?.id,
          room: schedule.room,
        };
      })
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return dayjs(a.startTime, "HH:mm").diff(dayjs(b.startTime, "HH:mm"));
      });
  }, [classSubjects, schedulesQuery.data?.data, subjectMap, teacherMap]);

  const [scheduleDayFilter, setScheduleDayFilter] = useState<string>("ALL");

  const filteredScheduleRows = useMemo(() => {
    if (scheduleDayFilter === "ALL") {
      return scheduleRows;
    }
    const targetDay = Number(scheduleDayFilter);
    return scheduleRows.filter((row) => row.dayOfWeek === targetDay);
  }, [scheduleDayFilter, scheduleRows]);

  const weeklyGrouped = useMemo(() => {
    const groups = new Map<number, ScheduleRow[]>();
    scheduleRows.forEach((row) => {
      const current = groups.get(row.dayOfWeek) ?? [];
      current.push(row);
      groups.set(
        row.dayOfWeek,
        current.sort((a, b) => dayjs(a.startTime, "HH:mm").diff(dayjs(b.startTime, "HH:mm")))
      );
    });
    return groups;
  }, [scheduleRows]);

  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<string | null>(null);

  const handleRemoveMember = useCallback(
    (row: MemberRow) => {
      setRemovingEnrollmentId(row.enrollmentId);
      deleteEnrollment(
        { resource: "enrollments", id: row.enrollmentId },
        {
          onSuccess: async () => {
            notify?.({
              type: "success",
              message: "Siswa dihapus dari kelas",
            });
            setRemovingEnrollmentId(null);
            await enrollmentsQuery.refetch?.();
          },
          onError: (error) => {
            notify?.({
              type: "error",
              message: "Gagal menghapus siswa",
              description: error instanceof Error ? error.message : String(error),
            });
            setRemovingEnrollmentId(null);
          },
        }
      );
    },
    [deleteEnrollment, enrollmentsQuery.refetch, notify]
  );

  const membersColumns: ColumnsType<MemberRow> = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "order",
        width: 64,
        render: (value: number) => <Typography.Text>{value}</Typography.Text>,
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
        render: (value?: string) => value ?? "-",
      },
      {
        title: "Nama",
        dataIndex: "fullName",
        render: (value: string | undefined, record) =>
          value ? (
            <Button
              type="link"
              size="small"
              onClick={() => show("students", record.studentId)}
              style={{ padding: 0 }}
            >
              {value}
            </Button>
          ) : (
            <Typography.Text type="secondary">Tanpa nama</Typography.Text>
          ),
      },
      {
        title: "Gender",
        dataIndex: "gender",
        width: 100,
        render: (value?: "M" | "F") => formatGender(value),
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 120,
        render: (value?: string) => {
          if (!value) {
            return <Typography.Text type="secondary">-</Typography.Text>;
          }
          const isActive = value === "active";
          return <Tag color={isActive ? "green" : "red"}>{isActive ? "Aktif" : "Nonaktif"}</Tag>;
        },
      },
      {
        title: "Aksi",
        key: "actions",
        width: 120,
        render: (_: unknown, record) => (
          <Popconfirm
            title="Hapus siswa dari kelas?"
            description="Siswa tetap tersimpan di sistem tetapi dilepas dari kelas ini."
            okText="Hapus"
            okButtonProps={{ danger: true }}
            cancelText="Batal"
            onConfirm={() => handleRemoveMember(record)}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={removingEnrollmentId === record.enrollmentId}
            >
              Hapus
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [handleRemoveMember, removingEnrollmentId, show]
  );

  const scheduleColumns: ColumnsType<ScheduleRow> = useMemo(
    () => [
      {
        title: "Hari",
        dataIndex: "dayLabel",
        width: 120,
      },
      {
        title: "Jam ke",
        dataIndex: "periodLabel",
        width: 100,
        render: (value?: string) => (value ? <Tag color="blue">{value}</Tag> : "-"),
      },
      {
        title: "Jam",
        dataIndex: "startTime",
        width: 140,
        render: (_: string, record) => (
          <Typography.Text>
            {record.startTime} - {record.endTime}
          </Typography.Text>
        ),
      },
      {
        title: "Mapel",
        dataIndex: "subjectName",
        render: (value: string | undefined, record) =>
          record.subjectId ? (
            <Button
              type="link"
              size="small"
              onClick={() => show("subjects", record.subjectId!)}
              style={{ padding: 0 }}
            >
              {value ?? "Tanpa mapel"}
            </Button>
          ) : (
            (value ?? "-")
          ),
      },
      {
        title: "Guru",
        dataIndex: "teacherName",
        render: (value: string | undefined, record) =>
          record.teacherId ? (
            <Button
              type="link"
              size="small"
              onClick={() => show("teachers", record.teacherId!)}
              style={{ padding: 0 }}
            >
              {value ?? "-"}
            </Button>
          ) : (
            (value ?? "-")
          ),
      },
      {
        title: "Kelas",
        dataIndex: "className",
        width: 160,
        render: () => classRecord?.name ?? "-",
      },
      {
        title: "Ruang",
        dataIndex: "room",
        width: 120,
        render: (value?: string) => value ?? "-",
      },
    ],
    [classRecord?.name, show]
  );

  const membersLoading =
    classQuery?.isLoading ||
    enrollmentsQuery.isLoading ||
    enrollmentsQuery.isFetching ||
    studentsQuery.isLoading;

  const scheduleLoading =
    classSubjectsQuery.isLoading ||
    classSubjectsQuery.isFetching ||
    schedulesQuery.isLoading ||
    schedulesQuery.isFetching ||
    teachersMany.isLoading ||
    subjectsMany.isLoading;

  const totalStudents = memberRows.length;
  const capacity = (classRecord?.capacity as number | undefined) ?? 36;

  const headerActions = (
    <Space>
      <Button onClick={() => list("classes")}>Kembali</Button>
      {classRecord?.id ? (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => edit("classes", classRecord.id!)}
        >
          Edit
        </Button>
      ) : null}
    </Space>
  );

  const membersContent = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => create("students")}>
          Tambah siswa
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={() =>
            notify?.({
              type: "info",
              message: "Import CSV siswa",
              description: "Integrasi import CSV akan diaktifkan setelah pipeline siap.",
            })
          }
        >
          Import CSV
        </Button>
      </Space>
      <Typography.Text type="secondary">
        Seret dan lepas daftar siswa untuk pindah kelas (fitur drag & drop akan dirilis segera).
      </Typography.Text>
      <Table<MemberRow>
        rowKey="enrollmentId"
        columns={membersColumns}
        dataSource={memberRows}
        loading={membersLoading}
        pagination={false}
        scroll={{ x: true }}
      />
    </Space>
  );

  const scheduleContent = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <Segmented
          options={[
            { label: "Semua", value: "ALL" },
            ...DAY_OPTIONS.map((day) => ({ label: day.label, value: day.value })),
          ]}
          value={scheduleDayFilter}
          onChange={(value) => setScheduleDayFilter(String(value))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => create("schedules")}>
          Tambah Jadwal
        </Button>
      </Space>

      <Table<ScheduleRow>
        rowKey="id"
        columns={scheduleColumns}
        dataSource={filteredScheduleRows}
        loading={scheduleLoading}
        pagination={false}
        scroll={{ x: true }}
      />

      <Card title="Tampilan Mingguan">
        <Space
          align="start"
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}
        >
          {DAY_OPTIONS.map((day) => {
            const dayValue = Number(day.value);
            const schedules = weeklyGrouped.get(dayValue) ?? [];

            return (
              <Card
                key={day.value}
                size="small"
                title={
                  <Space>
                    <CalendarOutlined />
                    <span>{day.label}</span>
                  </Space>
                }
                style={{ flex: "1 1 220px" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {schedules.length === 0 ? (
                    <Typography.Text type="secondary">Tidak ada jadwal.</Typography.Text>
                  ) : (
                    schedules.map((item) => (
                      <Card key={item.id} size="small" bordered>
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          <Typography.Text strong>
                            {item.subjectName ?? "Mapel"} · {item.startTime} - {item.endTime}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {item.teacherName ?? "Guru belum ditetapkan"}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            Ruang {item.room ?? "-"}
                          </Typography.Text>
                        </Space>
                      </Card>
                    ))
                  )}
                </Space>
              </Card>
            );
          })}
        </Space>
      </Card>
    </Space>
  );

  const attendanceContent = (
    <Card>
      <Empty description="Ringkasan kehadiran akan tersedia setelah integrasi dengan modul attendance." />
    </Card>
  );

  const gradesContent = (
    <Card>
      <Empty description="Rekap nilai kelas ini akan tampil setelah modul penilaian selesai." />
    </Card>
  );

  if (classQuery.isLoading) {
    return (
      <ResourceActionGuard action="show" resourceName="classes">
        <Card>
          <Space direction="vertical" align="center" style={{ width: "100%", padding: 48 }}>
            <Spin size="large" />
            <Typography.Text>Memuat detail kelas...</Typography.Text>
          </Space>
        </Card>
      </ResourceActionGuard>
    );
  }

  if (classQuery.isError) {
    const error = classQuery.error as { message?: string };
    return (
      <ResourceActionGuard action="show" resourceName="classes">
        <Result
          status="error"
          title="Gagal memuat kelas"
          subTitle={error?.message ?? "Terjadi kesalahan saat mengambil detail kelas."}
        />
      </ResourceActionGuard>
    );
  }

  if (!classRecord) {
    return (
      <ResourceActionGuard action="show" resourceName="classes">
        <Result status="404" title="Kelas tidak ditemukan" />
      </ResourceActionGuard>
    );
  }

  return (
    <ResourceActionGuard action="show" resourceName="classes">
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <Card
          title={
            <Space direction="vertical" size={4}>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {classRecord.name}{" "}
                {termRecord ? (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {buildTermLabel(termRecord)}
                  </Tag>
                ) : null}
              </Typography.Title>
              <Typography.Text type="secondary">
                {classRecord.code
                  ? `Kode Kelas: ${classRecord.code}`
                  : "Kode kelas belum ditentukan"}
              </Typography.Text>
            </Space>
          }
          extra={headerActions}
        >
          <Space size={16} wrap>
            <Typography.Text>
              Wali Kelas:{" "}
              {homeroomTeacher ? (
                <Tooltip title="Lihat detail guru">
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => show("teachers", homeroomTeacher.id)}
                  >
                    {homeroomTeacher.fullName}
                  </Button>
                </Tooltip>
              ) : (
                <Typography.Text type="secondary">Belum ditetapkan</Typography.Text>
              )}
            </Typography.Text>
            <Divider type="vertical" />
            <Typography.Text>
              Jumlah siswa: <Tag color="blue">{totalStudents}</Tag>
            </Typography.Text>
            <Divider type="vertical" />
            <Typography.Text>
              Kapasitas: <Tag color="purple">{capacity}</Tag>
            </Typography.Text>
          </Space>
        </Card>

        <Tabs
          defaultActiveKey="members"
          items={[
            {
              key: "members",
              label: "👩‍🎓 Anggota",
              children: membersContent,
            },
            {
              key: "schedule",
              label: "📚 Jadwal",
              children: scheduleContent,
            },
            {
              key: "attendance",
              label: "🗓️ Rekap Kehadiran",
              children: attendanceContent,
            },
            {
              key: "grades",
              label: "📝 Nilai",
              children: gradesContent,
            },
          ]}
        />
      </Space>
    </ResourceActionGuard>
  );
};
