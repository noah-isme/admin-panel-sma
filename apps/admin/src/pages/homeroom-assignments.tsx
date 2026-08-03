import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
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
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { List } from "@refinedev/antd";
import { useList, useUpdate, type HttpError } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { EditOutlined, ReloadOutlined } from "@ant-design/icons";

type Track = "IPA" | "IPS";

type ClassRecord = {
  id: string;
  code: string;
  name: string;
  level: number;
  track: Track;
  homeroomId?: string | null;
  termId?: string | null;
};

type TeacherRecord = {
  id: string;
  fullName: string;
};

type TermRecord = {
  id: string;
  name: string;
  year: string;
  semester: number;
};

type EnrollmentRecord = {
  id: string;
  classId: string;
};

type TrackFilter = Track | "ALL";
type LevelFilter = number | "ALL";

const TRACK_LABEL: Record<Track, string> = {
  IPA: "IPA",
  IPS: "IPS",
};

const LEVEL_LABEL: Record<number, string> = {
  10: "Kelas X",
  11: "Kelas XI",
  12: "Kelas XII",
};

const trackColors: Record<Track, string> = {
  IPA: "processing",
  IPS: "gold",
};

const toClassLabel = (klass: ClassRecord) => `${klass.code} • ${klass.name}`;

const DEFAULT_PAGE_STATE = { current: 1, pageSize: 10 } as const;

export const HomeroomAssignmentsPage: React.FC = () => {
  const { open: notify } = useAppNotification();
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<TrackFilter>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("ALL");
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: DEFAULT_PAGE_STATE.current,
    pageSize: DEFAULT_PAGE_STATE.pageSize,
    showSizeChanger: false,
  });

  const {
    data: classesResponse,
    isLoading: isLoadingClasses,
    refetch: refetchClasses,
  } = useList<ClassRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
    queryOptions: {
      staleTime: 30_000,
    },
  });

  const allClasses = useMemo(
    () =>
      (classesResponse?.data ?? []).slice().sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      }),
    [classesResponse?.data]
  );

  const { data: teacherResponse, isLoading: isLoadingTeachers } = useList<TeacherRecord>({
    resource: "teachers",
    pagination: { current: 1, pageSize: 200 },
    queryOptions: { staleTime: 60_000 },
  });

  const teacherMap = useMemo(() => {
    const records = teacherResponse?.data ?? [];
    return new Map(records.map((teacher) => [teacher.id, teacher]));
  }, [teacherResponse?.data]);

  const teacherOptions = useMemo(
    () =>
      (teacherResponse?.data ?? []).map((teacher) => ({
        label: teacher.fullName,
        value: teacher.id,
      })),
    [teacherResponse?.data]
  );

  const { data: termResponse } = useList<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 50 },
    queryOptions: { staleTime: 120_000 },
  });

  const termMap = useMemo(() => {
    const records = termResponse?.data ?? [];
    return new Map(records.map((term) => [term.id, term]));
  }, [termResponse?.data]);

  const { data: enrollmentResponse } = useList<EnrollmentRecord>({
    resource: "enrollments",
    pagination: { current: 1, pageSize: 1_000 },
    queryOptions: { staleTime: 30_000 },
  });

  const studentCountByClass = useMemo(() => {
    const records = enrollmentResponse?.data ?? [];
    return records.reduce<Map<string, number>>((acc, enrollment) => {
      const current = acc.get(enrollment.classId) ?? 0;
      acc.set(enrollment.classId, current + 1);
      return acc;
    }, new Map());
  }, [enrollmentResponse?.data]);

  const filteredClasses = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return allClasses.filter((klass) => {
      const matchesTrack = selectedTrack === "ALL" || klass.track === selectedTrack;
      const matchesLevel = selectedLevel === "ALL" || klass.level === selectedLevel;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        klass.name.toLowerCase().includes(normalizedSearch) ||
        klass.code.toLowerCase().includes(normalizedSearch);
      return matchesTrack && matchesLevel && matchesSearch;
    });
  }, [allClasses, searchValue, selectedLevel, selectedTrack]);

  const paginatedClasses = useMemo(() => {
    const current = pagination.current ?? DEFAULT_PAGE_STATE.current;
    const pageSize = pagination.pageSize ?? DEFAULT_PAGE_STATE.pageSize;
    const startIndex = (current - 1) * pageSize;
    return filteredClasses.slice(startIndex, startIndex + pageSize);
  }, [filteredClasses, pagination.current, pagination.pageSize]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setPagination((prev) => ({ ...prev, current: DEFAULT_PAGE_STATE.current }));
  };

  const { mutate: updateClass, isLoading: isSaving } = useUpdate<ClassRecord, HttpError>();

  const handleOpenDrawer = useCallback((klass: ClassRecord) => {
    setEditingClass(klass);
    setSelectedTeacherId(klass.homeroomId ?? null);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setEditingClass(null);
    setSelectedTeacherId(null);
  }, []);

  const handleSubmitAssignment = useCallback(() => {
    if (!editingClass) {
      return;
    }

    updateClass(
      {
        resource: "classes",
        id: editingClass.id,
        values: { homeroomId: selectedTeacherId ?? null },
      },
      {
        onSuccess: ({ data }) => {
          const homeroomName =
            selectedTeacherId && teacherMap.get(selectedTeacherId)
              ? teacherMap.get(selectedTeacherId)!.fullName
              : "Belum ditentukan";
          notify?.({
            type: "success",
            message: "Wali kelas diperbarui",
            description: `${data.name} sekarang diampu oleh ${homeroomName}.`,
          });
          handleCloseDrawer();
          void refetchClasses();
        },
        onError: (error) => {
          notify?.({
            type: "error",
            message: "Gagal menyimpan wali kelas",
            description:
              error?.message ??
              "Terjadi kesalahan saat menyimpan perubahan. Coba lagi beberapa saat.",
          });
        },
      }
    );
  }, [
    editingClass,
    handleCloseDrawer,
    notify,
    refetchClasses,
    selectedTeacherId,
    teacherMap,
    updateClass,
  ]);

  const assignedCount = useMemo(
    () => filteredClasses.filter((klass) => Boolean(klass.homeroomId)).length,
    [filteredClasses]
  );

  const uniqueHomeroomTeachers = useMemo(() => {
    const ids = new Set<string>();
    filteredClasses.forEach((klass) => {
      if (klass.homeroomId) {
        ids.add(klass.homeroomId);
      }
    });
    return ids.size;
  }, [filteredClasses]);

  const columns: ColumnsType<ClassRecord> = useMemo(
    () => [
      {
        title: "Kelas",
        dataIndex: "name",
        key: "name",
        render: (_: unknown, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.name}</Typography.Text>
            <Typography.Text type="secondary">{record.code}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Tingkat",
        dataIndex: "level",
        key: "level",
        width: 120,
        render: (value: number) => LEVEL_LABEL[value] ?? `Kelas ${value}`,
      },
      {
        title: "Jurusan",
        dataIndex: "track",
        key: "track",
        width: 120,
        render: (value: Track) => (
          <Tag color={trackColors[value]} style={{ textTransform: "uppercase" }}>
            {TRACK_LABEL[value]}
          </Tag>
        ),
      },
      {
        title: "Tahun Ajar / Semester",
        dataIndex: "termId",
        key: "termId",
        width: 200,
        render: (termId?: string | null) => {
          const term = termId ? termMap.get(termId) : null;
          if (!term) return <Typography.Text type="secondary">-</Typography.Text>;
          return (
            <Tooltip title={term.name}>
              <Typography.Text>{`${term.year} / Semester ${term.semester}`}</Typography.Text>
            </Tooltip>
          );
        },
      },
      {
        title: "Jumlah Siswa",
        dataIndex: "id",
        key: "studentCount",
        width: 140,
        render: (id: string) => studentCountByClass.get(id) ?? 0,
      },
      {
        title: "Wali Kelas",
        dataIndex: "homeroomId",
        key: "homeroomId",
        render: (homeroomId: string | null | undefined, record) => {
          const teacher = homeroomId ? teacherMap.get(homeroomId) : null;
          return (
            <Space direction="horizontal">
              <Typography.Text>
                {teacher ? (
                  teacher.fullName
                ) : (
                  <Typography.Text type="secondary">Belum diatur</Typography.Text>
                )}
              </Typography.Text>
              <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenDrawer(record)}>
                Atur
              </Button>
            </Space>
          );
        },
      },
    ],
    [handleOpenDrawer, studentCountByClass, teacherMap, termMap]
  );

  const levelOptions = useMemo(
    () => [
      { label: "Semua Tingkat", value: "ALL" as LevelFilter },
      { label: LEVEL_LABEL[10], value: 10 as LevelFilter },
      { label: LEVEL_LABEL[11], value: 11 as LevelFilter },
      { label: LEVEL_LABEL[12], value: 12 as LevelFilter },
    ],
    []
  );

  const trackOptions = useMemo(
    () => [
      { label: "Semua Jurusan", value: "ALL" as TrackFilter },
      { label: "IPA", value: "IPA" as TrackFilter },
      { label: "IPS", value: "IPS" as TrackFilter },
    ],
    []
  );

  return (
    <List
      title="Penugasan Wali Kelas"
      headerButtons={() => (
        <Space>
          <Tooltip title="Muat ulang data">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void refetchClasses();
              }}
              loading={isLoadingClasses}
            >
              Refresh
            </Button>
          </Tooltip>
        </Space>
      )}
      canCreate={false}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingClasses}>
              <Statistic title="Total Kelas" value={filteredClasses.length} />
              <Typography.Text type="secondary">
                {assignedCount} kelas sudah memiliki wali kelas.
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingClasses}>
              <Statistic title="Belum Terisi" value={filteredClasses.length - assignedCount} />
              <Typography.Text type="secondary">
                {filteredClasses.length - assignedCount === 0
                  ? "Semua kelas sudah memiliki wali."
                  : "Segera tentukan wali kelas untuk kelas berikut."}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered loading={isLoadingClasses}>
              <Statistic title="Guru Terlibat" value={uniqueHomeroomTeachers} />
              <Typography.Text type="secondary">
                Guru aktif yang ditugaskan sebagai wali kelas.
              </Typography.Text>
            </Card>
          </Col>
        </Row>

        <Space wrap size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
          <Space size="middle" wrap>
            <Input.Search
              allowClear
              placeholder="Cari nama atau kode kelas"
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);
                if (value.length === 0) {
                  setSearchValue("");
                  setPagination((prev) => ({ ...prev, current: DEFAULT_PAGE_STATE.current }));
                }
              }}
              onSearch={(value) => {
                setSearchInput(value);
                handleSearch(value);
              }}
              style={{ width: 260 }}
            />
            <Select
              options={trackOptions}
              value={selectedTrack}
              style={{ width: 180 }}
              onChange={(value) => {
                setSelectedTrack(value as TrackFilter);
                setPagination((prev) => ({ ...prev, current: DEFAULT_PAGE_STATE.current }));
              }}
            />
            <Select
              options={levelOptions}
              value={selectedLevel}
              style={{ width: 180 }}
              onChange={(value) => {
                setSelectedLevel(value as LevelFilter);
                setPagination((prev) => ({ ...prev, current: DEFAULT_PAGE_STATE.current }));
              }}
            />
          </Space>
        </Space>

        <Table<ClassRecord>
          dataSource={paginatedClasses}
          columns={columns}
          rowKey="id"
          loading={isLoadingClasses}
          pagination={{
            ...pagination,
            total: filteredClasses.length,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
        />
      </Space>

      <Drawer
        open={Boolean(editingClass)}
        onClose={handleCloseDrawer}
        title={editingClass ? `Atur Wali Kelas • ${toClassLabel(editingClass)}` : "Atur Wali Kelas"}
        width={420}
      >
        {editingClass ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Form layout="vertical">
              <Form.Item label="Kelas">
                <Typography.Text strong>{editingClass.name}</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {editingClass.code} •{" "}
                  {LEVEL_LABEL[editingClass.level] ?? `Kelas ${editingClass.level}`}
                </Typography.Paragraph>
              </Form.Item>
              <Form.Item
                label="Pilih Guru"
                tooltip="Guru yang dipilih akan menjadi wali kelas dan dapat mengakses laporan kelas."
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Pilih guru"
                  loading={isLoadingTeachers}
                  value={selectedTeacherId ?? undefined}
                  onChange={(value) => setSelectedTeacherId(value ?? null)}
                  options={teacherOptions}
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Form>

            <Space>
              <Button onClick={handleCloseDrawer}>Batal</Button>
              <Button type="primary" onClick={handleSubmitAssignment} loading={isSaving}>
                Simpan Perubahan
              </Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </List>
  );
};
