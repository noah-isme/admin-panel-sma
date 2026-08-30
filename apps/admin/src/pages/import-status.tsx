import { useList } from "../hooks/use-refine-list";
import React from "react";
import { Button, Card, Col, List, Row, Space, Statistic, Table, Typography } from "antd";
import { useNavigate } from "react-router";
import { ResourceActionGuard } from "../components/resource-action-guard";

/**
 * Read-only pre-semester snapshot. Imports are synchronous row operations;
 * this page intentionally reports the current tables rather than polling a
 * server-side import job.
 */
export const PreSemesterSnapshotPage: React.FC = () => {
  const navigate = useNavigate();

  const migratedStudentsQuery = useList({
    resource: "students",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const studentsQuery = {
    ...migratedStudentsQuery.result,
    ...migratedStudentsQuery.query,
    ...migratedStudentsQuery,
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

  const migratedClassSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classSubjectsQuery = {
    ...migratedClassSubjectsQuery.result,
    ...migratedClassSubjectsQuery.query,
    ...migratedClassSubjectsQuery,
  };

  const migratedSchedulesQuery = useList({
    resource: "schedules",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const schedulesQuery = {
    ...migratedSchedulesQuery.result,
    ...migratedSchedulesQuery.query,
    ...migratedSchedulesQuery,
  };

  const students = (studentsQuery.data?.data as Record<string, any>[]) ?? [];
  const teachers = (teachersQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];
  const subjects = (subjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const mappings = (classSubjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const schedules = (schedulesQuery.data?.data as Record<string, any>[]) ?? [];

  const studentColumns = React.useMemo(
    () => [
      {
        title: "Nama",
        dataIndex: "fullName",
      },
      {
        title: "Wali",
        dataIndex: "guardian",
        render: (_: string, record: Record<string, any>) => (
          <span>
            {record.guardian ?? "-"}
            <br />
            <Typography.Text type="secondary">{record.guardianPhone ?? "-"}</Typography.Text>
          </span>
        ),
      },
    ],
    []
  );

  const teacherColumns = React.useMemo(
    () => [
      {
        title: "Nama",
        dataIndex: "fullName",
      },
      {
        title: "Kontak",
        dataIndex: "email",
        render: (_: string, record: Record<string, any>) => (
          <span>
            {record.email ?? "-"}
            <br />
            <Typography.Text type="secondary">{record.phone ?? "-"}</Typography.Text>
          </span>
        ),
      },
    ],
    []
  );

  const mappingDictionary = React.useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    mappings.forEach((item) => map.set(item.id, item));
    return map;
  }, [mappings]);

  const classesDictionary = React.useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    classes.forEach((item) => map.set(item.id, item));
    return map;
  }, [classes]);

  const subjectsDictionary = React.useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    subjects.forEach((item) => map.set(item.id, item));
    return map;
  }, [subjects]);

  const teachersDictionary = React.useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    teachers.forEach((item) => map.set(item.id, item));
    return map;
  }, [teachers]);

  const dayLabel = (value: number) => {
    switch (value) {
      case 1:
        return "Senin";
      case 2:
        return "Selasa";
      case 3:
        return "Rabu";
      case 4:
        return "Kamis";
      case 5:
        return "Jumat";
      case 6:
        return "Sabtu";
      default:
        return `Hari ${value}`;
    }
  };

  return (
    <ResourceActionGuard action="list" resourceName="students">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Space align="center" style={{ justifyContent: "space-between" }}>
            <div>
              <Typography.Title level={2} style={{ marginBottom: 0 }}>
                Snapshot Pra-Semester
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                Lihat snapshot data siswa, guru, kelas, mapping, dan jadwal setelah proses impor
                sinkron. Gunakan tombol di bawah untuk membuka modul terkait.
              </Typography.Paragraph>
            </div>
            <Space>
              <Button onClick={() => navigate("/setup")}>Buka Wizard Pra-Semester</Button>
              <Button type="primary" onClick={() => navigate("/students")}>
                Lihat Data Siswa
              </Button>
            </Space>
          </Space>

          <Row gutter={16}>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic title="Total Siswa" value={students.length} />
                <Button type="link" onClick={() => navigate("/students")}>
                  Kelola Siswa
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic title="Total Guru" value={teachers.length} />
                <Button type="link" onClick={() => navigate("/teachers")}>
                  Kelola Guru
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic title="Total Kelas" value={classes.length} />
                <Button type="link" onClick={() => navigate("/classes")}>
                  Kelola Kelas
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic title="Mapping Mapel" value={mappings.length} />
                <Button type="link" onClick={() => navigate("/subjects")}>
                  Kelola Mapel
                </Button>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card
                title="Siswa Terbaru"
                extra={<Button onClick={() => navigate("/students")}>Lihat Semua</Button>}
              >
                <Table
                  size="small"
                  dataSource={students.slice(0, 10)}
                  columns={studentColumns}
                  pagination={false}
                  rowKey={(record) => record.id ?? record.nis}
                  locale={{ emptyText: "Belum ada data siswa." }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                title="Guru Terbaru"
                extra={<Button onClick={() => navigate("/teachers")}>Lihat Semua</Button>}
              >
                <Table
                  size="small"
                  dataSource={teachers.slice(0, 10)}
                  columns={teacherColumns}
                  pagination={false}
                  rowKey={(record) => record.id ?? record.nip}
                  locale={{ emptyText: "Belum ada data guru." }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Statistik Jadwal">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Statistic title="Total Jadwal" value={schedules.length} />
              </Col>
              <Col xs={24} md={16}>
                <List
                  size="small"
                  header={<strong>Jadwal Contoh</strong>}
                  dataSource={schedules.slice(0, 5)}
                  renderItem={(item) => (
                    <List.Item>
                      {(() => {
                        const mapping = mappingDictionary.get(item.classSubjectId);
                        const className = mapping?.classroomId
                          ? (classesDictionary.get(mapping.classroomId)?.name ??
                            mapping.classroomId)
                          : item.classSubjectId;
                        const subjectName = mapping?.subjectId
                          ? (subjectsDictionary.get(mapping.subjectId)?.name ?? mapping.subjectId)
                          : "-";
                        const teacherName = mapping?.teacherId
                          ? (teachersDictionary.get(mapping.teacherId)?.fullName ??
                            mapping.teacherId)
                          : "Belum ditetapkan";
                        return (
                          <Typography.Text>
                            {dayLabel(item.dayOfWeek)} · {item.startTime}-{item.endTime} ·{" "}
                            {className} · {subjectName} · {teacherName}
                          </Typography.Text>
                        );
                      })()}
                    </List.Item>
                  )}
                  locale={{ emptyText: "Belum ada data jadwal." }}
                />
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
