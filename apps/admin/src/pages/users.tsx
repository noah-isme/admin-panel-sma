import { useList } from "../hooks/use-refine-list";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { List, useTable } from "@refinedev/antd";
import { useMany, useNavigation, type CrudFilter } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { EyeOutlined, KeyOutlined, ReloadOutlined } from "@ant-design/icons";

type RoleMeta = {
  label: string;
  description: string;
  color: string;
};

const ROLE_DETAILS = {
  SUPERADMIN: {
    label: "Super Admin",
    description:
      "Memiliki akses penuh untuk mengelola konfigurasi, pengguna, dan data strategis sekolah.",
    color: "magenta",
  },
  ADMIN_TU: {
    label: "Admin Tata Usaha",
    description: "Mengelola data operasional seperti siswa, guru, kelas, dan akademik harian.",
    color: "geekblue",
  },
  KEPALA_SEKOLAH: {
    label: "Kepala Sekolah",
    description: "Memantau laporan, dashboard, dan menyetujui kebijakan akademik.",
    color: "volcano",
  },
  WALI_KELAS: {
    label: "Wali Kelas",
    description: "Mengelola data siswa dan absensi kelas yang menjadi tanggung jawabnya.",
    color: "blue",
  },
  GURU_MAPEL: {
    label: "Guru Mapel",
    description: "Mengisi penilaian, absensi per mata pelajaran, dan catatan perilaku.",
    color: "green",
  },
  SISWA: {
    label: "Siswa",
    description: "Mengakses jadwal, absensi pribadi, nilai, dan pengumuman sekolah.",
    color: "gold",
  },
  ORTU: {
    label: "Orang Tua / Wali",
    description: "Memantau perkembangan akademik, absensi, dan catatan perilaku anak.",
    color: "purple",
  },
} satisfies Record<string, RoleMeta>;

type UserRole = keyof typeof ROLE_DETAILS;

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  teacherId?: string | null;
  studentId?: string | null;
  classId?: string | null;
};

type TeacherRecord = {
  id: string;
  fullName: string;
};

type StudentRecord = {
  id: string;
  fullName: string;
};

type ClassRecord = {
  id: string;
  name: string;
  code?: string;
};

const PASSWORD_HINT = "Admin123!";

const roleOptions = (Object.entries(ROLE_DETAILS) as [UserRole, RoleMeta][]).map(
  ([value, meta]) => ({
    label: meta.label,
    value,
  })
);

const getInitials = (value: string) => {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return value.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolveRoleMeta = (role: UserRole): RoleMeta => ROLE_DETAILS[role];

const buildStats = (users: UserRecord[]) => {
  const total = users.length;
  const roleCounts = new Map<UserRole, number>();
  let linkedTeachers = 0;
  let linkedStudents = 0;

  users.forEach((user) => {
    roleCounts.set(user.role, (roleCounts.get(user.role) ?? 0) + 1);
    if (user.teacherId) linkedTeachers += 1;
    if (user.studentId) linkedStudents += 1;
  });

  const activeRoles = Array.from(roleCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([role]) => role);

  return {
    total,
    roleCounts,
    activeRoles,
    linkedTeachers,
    linkedStudents,
  };
};

export const UsersPage: React.FC = () => {
  const { open: notify } = useAppNotification();
  const { show } = useNavigation();

  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "ALL">("ALL");
  const [activeUser, setActiveUser] = useState<UserRecord | null>(null);
  const activeRoleMeta = activeUser ? resolveRoleMeta(activeUser.role) : null;

  const {
    tableProps,
    setFilters,
    tableQuery: { refetch, isFetching } = {},
  } = useTable<UserRecord>({
    resource: "users",
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [
        {
          field: "fullName",
          order: "asc",
        },
      ],
    },
  });

  const {
    result: allUsersResponse,
    query: { isLoading: isLoadingAllUsers },
  } = useList<UserRecord>({
    resource: "users",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      staleTime: 30_000,
    },
  });

  const allUsers = useMemo(() => allUsersResponse?.data ?? [], [allUsersResponse?.data]);
  const stats = useMemo(() => buildStats(allUsers), [allUsers]);

  const { dataSource: rawDataSource, pagination, ...restTableProps } = tableProps;

  const tableData = useMemo(() => {
    if (!Array.isArray(rawDataSource)) {
      return [] as UserRecord[];
    }
    return rawDataSource as UserRecord[];
  }, [rawDataSource]);

  const teacherIds = useMemo(
    () =>
      Array.from(
        new Set(tableData.map((user) => user.teacherId).filter((value): value is string => !!value))
      ),
    [tableData]
  );

  const studentIds = useMemo(
    () =>
      Array.from(
        new Set(tableData.map((user) => user.studentId).filter((value): value is string => !!value))
      ),
    [tableData]
  );

  const classIds = useMemo(
    () =>
      Array.from(
        new Set(tableData.map((user) => user.classId).filter((value): value is string => !!value))
      ),
    [tableData]
  );

  const { result: teacherResponse } = useMany<TeacherRecord>({
    resource: "teachers",
    ids: teacherIds,
    queryOptions: {
      enabled: teacherIds.length > 0,
    },
  });

  const { result: studentResponse } = useMany<StudentRecord>({
    resource: "students",
    ids: studentIds,
    queryOptions: {
      enabled: studentIds.length > 0,
    },
  });

  const { result: classResponse } = useMany<ClassRecord>({
    resource: "classes",
    ids: classIds,
    queryOptions: {
      enabled: classIds.length > 0,
    },
  });

  const teacherMap = useMemo(() => {
    const records = teacherResponse?.data ?? [];
    return new Map(records.map((item) => [item.id, item]));
  }, [teacherResponse?.data]);

  const studentMap = useMemo(() => {
    const records = studentResponse?.data ?? [];
    return new Map(records.map((item) => [item.id, item]));
  }, [studentResponse?.data]);

  const classMap = useMemo(() => {
    const records = classResponse?.data ?? [];
    return new Map(records.map((item) => [item.id, item]));
  }, [classResponse?.data]);

  useEffect(() => {
    const nextFilters: CrudFilter[] = [];

    if (selectedRole !== "ALL") {
      nextFilters.push({
        field: "role",
        operator: "eq",
        value: selectedRole,
      });
    }

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch.length > 0) {
      const isEmail = trimmedSearch.includes("@");
      nextFilters.push({
        field: isEmail ? "email" : "fullName",
        operator: "contains",
        value: trimmedSearch,
      });
    }

    if (setFilters) {
      setFilters(nextFilters, "replace");
    }
  }, [searchTerm, selectedRole, setFilters]);

  const handleSearch = (rawValue: string) => {
    setSearchTerm(rawValue.trim());
  };

  const handleResetPassword = useCallback(
    (user: UserRecord) => {
      notify?.({
        type: "success",
        message: `Password ${user.fullName} sudah di-reset`,
        description: `Gunakan password default ${PASSWORD_HINT} pada login berikutnya.`,
      });
    },
    [notify]
  );

  const columns: ColumnsType<UserRecord> = useMemo(
    () => [
      {
        title: "Pengguna",
        dataIndex: "fullName",
        key: "fullName",
        render: (_: unknown, record) => {
          const roleMeta = resolveRoleMeta(record.role);
          return (
            <Space direction="horizontal" size="middle">
              <Avatar style={{ backgroundColor: "#1d4ed8", color: "#ffffff" }}>
                {getInitials(record.fullName)}
              </Avatar>
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{record.fullName}</Typography.Text>
                <Typography.Text type="secondary">{record.email}</Typography.Text>
                <Tag color={roleMeta.color} style={{ marginTop: 4 }}>
                  {roleMeta.label}
                </Tag>
              </Space>
            </Space>
          );
        },
      },
      {
        title: "Relasi Data",
        dataIndex: "relations",
        key: "relations",
        render: (_: unknown, record) => {
          const relationTags: React.ReactNode[] = [];

          if (record.teacherId) {
            const teacher = teacherMap.get(record.teacherId);
            relationTags.push(
              <Tooltip
                key="teacher"
                title={teacher ? `Guru: ${teacher.fullName}` : "Guru terhubung"}
              >
                <Tag
                  color="blue"
                  onClick={() => teacher && show("teachers", record.teacherId!)}
                  style={{ cursor: teacher ? "pointer" : "default" }}
                >
                  Guru
                </Tag>
              </Tooltip>
            );
          }
          if (record.classId) {
            const classItem = classMap.get(record.classId);
            relationTags.push(
              <Tooltip
                key="class"
                title={
                  classItem
                    ? `Kelas: ${classItem.name}${classItem.code ? ` (${classItem.code})` : ""}`
                    : "Kelas terhubung"
                }
                placement="top"
              >
                <Tag
                  color="gold"
                  onClick={() => classItem && show("classes", record.classId!)}
                  style={{ cursor: classItem ? "pointer" : "default" }}
                >
                  Kelas
                </Tag>
              </Tooltip>
            );
          }
          if (record.studentId) {
            const student = studentMap.get(record.studentId);
            relationTags.push(
              <Tooltip
                key="student"
                title={student ? `Siswa: ${student.fullName}` : "Siswa terhubung"}
                placement="top"
              >
                <Tag color="cyan">{student ? "Siswa" : "Siswa Terhubung"}</Tag>
              </Tooltip>
            );
          }

          if (relationTags.length === 0) {
            return <Typography.Text type="secondary">Belum terhubung</Typography.Text>;
          }

          return (
            <Space size={[4, 4]} wrap>
              {relationTags}
            </Space>
          );
        },
      },
      {
        title: "Aksi",
        key: "actions",
        width: 160,
        render: (_: unknown, record) => (
          <Space>
            <Button type="link" icon={<EyeOutlined />} onClick={() => setActiveUser(record)}>
              Detail
            </Button>
            <Button type="link" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>
              Reset
            </Button>
          </Space>
        ),
      },
    ],
    [classMap, handleResetPassword, show, studentMap, teacherMap]
  );

  const roleDistributionContent = useMemo(() => {
    if (stats.roleCounts.size === 0) {
      return <Typography.Text type="secondary">Belum ada data pengguna.</Typography.Text>;
    }

    return (
      <Space size={[8, 8]} wrap>
        {(Object.entries(ROLE_DETAILS) as [UserRole, RoleMeta][]).map(([role, meta]) => {
          const count = stats.roleCounts.get(role) ?? 0;
          return (
            <Tooltip title={meta.description} key={role}>
              <Tag color={meta.color} style={{ padding: "4px 12px" }}>
                <Space size={6}>
                  <Typography.Text style={{ color: "inherit", fontWeight: 600 }}>
                    {meta.label}
                  </Typography.Text>
                  <Typography.Text style={{ color: "inherit" }}>{count}</Typography.Text>
                </Space>
              </Tag>
            </Tooltip>
          );
        })}
      </Space>
    );
  }, [stats.roleCounts]);

  return (
    <List title="Users & Roles" canCreate={false}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingAllUsers}>
              <Statistic title="Total Pengguna" value={stats.total} />
              <Typography.Text type="secondary">
                {stats.activeRoles.length} role aktif tercatat
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingAllUsers}>
              <Statistic title="Terhubung ke Guru" value={stats.linkedTeachers} />
              <Typography.Text type="secondary">
                {stats.linkedTeachers > 0
                  ? "Akun guru sudah tersinkron."
                  : "Belum ada akun guru yang terhubung."}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingAllUsers}>
              <Statistic title="Terhubung ke Siswa" value={stats.linkedStudents} />
              <Typography.Text type="secondary">
                {stats.linkedStudents > 0
                  ? "Akun siswa/orang tua terhubung."
                  : "Belum ada akun siswa yang terhubung."}
              </Typography.Text>
            </Card>
          </Col>
          <Col span={24}>
            <Card title="Distribusi Role" bordered loading={isLoadingAllUsers}>
              {roleDistributionContent}
            </Card>
          </Col>
        </Row>

        <Space
          wrap
          align="center"
          style={{
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <Space wrap size="middle">
            <Input.Search
              allowClear
              placeholder="Cari nama atau email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onSearch={handleSearch}
              style={{ width: 280 }}
            />
            <Select
              value={selectedRole}
              style={{ width: 220 }}
              options={[{ label: "Semua Role", value: "ALL" }, ...roleOptions]}
              onChange={(value) => setSelectedRole(value as UserRole | "ALL")}
            />
          </Space>
          <Tooltip title="Muat ulang data pengguna">
            <Button icon={<ReloadOutlined />} onClick={() => refetch?.()} loading={isFetching}>
              Refresh
            </Button>
          </Tooltip>
        </Space>

        <Table<UserRecord>
          {...restTableProps}
          dataSource={tableData}
          columns={columns}
          rowKey="id"
          pagination={
            pagination
              ? {
                  ...pagination,
                  showSizeChanger: false,
                }
              : false
          }
          onRow={(record) => ({
            onDoubleClick: () => setActiveUser(record),
          })}
          scroll={{ x: 720 }}
        />
      </Space>

      <Drawer
        open={Boolean(activeUser)}
        onClose={() => setActiveUser(null)}
        width={420}
        title="Detail Pengguna"
      >
        {activeUser ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space size="large" align="center">
              <Avatar size={72} style={{ backgroundColor: "#2563eb", color: "#fff", fontSize: 28 }}>
                {getInitials(activeUser.fullName)}
              </Avatar>
              <div>
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                  {activeUser.fullName}
                </Typography.Title>
                <Typography.Text type="secondary" copyable>
                  {activeUser.email}
                </Typography.Text>
              </div>
            </Space>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Role">
                <Tag color={activeRoleMeta?.color ?? "default"}>
                  {activeRoleMeta?.label ?? activeUser.role}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Guru Terkait">
                {activeUser.teacherId ? (
                  <Typography.Link onClick={() => show("teachers", activeUser.teacherId!)}>
                    {teacherMap.get(activeUser.teacherId)?.fullName ?? activeUser.teacherId}
                  </Typography.Link>
                ) : (
                  <Typography.Text type="secondary">Tidak terhubung</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Kelas Terkait">
                {activeUser.classId ? (
                  <Typography.Link onClick={() => show("classes", activeUser.classId!)}>
                    {classMap.get(activeUser.classId)?.name ?? activeUser.classId}
                  </Typography.Link>
                ) : (
                  <Typography.Text type="secondary">Tidak terhubung</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Siswa / Anak">
                {activeUser.studentId ? (
                  <Typography.Text>
                    {studentMap.get(activeUser.studentId)?.fullName ?? activeUser.studentId}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">Tidak terhubung</Typography.Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Button
              icon={<KeyOutlined />}
              type="primary"
              onClick={() => handleResetPassword(activeUser)}
            >
              Reset Password Default
            </Button>

            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {activeRoleMeta?.description ?? "Role ini belum memiliki deskripsi spesifik."}
            </Typography.Paragraph>
          </Space>
        ) : null}
      </Drawer>
    </List>
  );
};
