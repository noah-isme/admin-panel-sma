import { useList } from "../hooks/use-refine-list";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button, Card, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  UploadOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { List, useTable } from "@refinedev/antd";
import { useDelete, useMany, useNavigation, type CrudFilter } from "@refinedev/core";
import { isTermActive } from "../utils/terms";
import { useAppNotification } from "../hooks/use-app-notification";
import { ResourceActionGuard } from "../components/resource-action-guard";

type ClassResource = {
  id: string;
  code: string;
  name: string;
  homeroomId?: string | null;
  termId?: string | null;
};

type TeacherResource = {
  id: string;
  fullName: string;
};

type TermResource = {
  id: string;
  name: string;
  year: string;
  semester: number;
  active?: boolean;
  isActive?: boolean;
};

type EnrollmentResource = {
  id: string;
  classId: string;
};

type ClassTableRow = ClassResource & {
  homeroomName?: string;
  studentCount: number;
  termLabel?: string;
  termName?: string;
};

const SEMESTER_OPTIONS = [
  { label: "Semester Ganjil (1)", value: "1" },
  { label: "Semester Genap (2)", value: "2" },
];

const buildTermLabel = (term?: TermResource) => {
  if (!term) return "-";
  return `${term.year}/${term.semester}`;
};

const enterpriseCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  boxShadow: "none",
  borderRadius: 6,
};

export const ClassesPage: React.FC = () => {
  const { show, edit, create } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteOne } = useDelete();

  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [selectedHomeroom, setSelectedHomeroom] = useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  const {
    tableProps,
    setFilters,
    setSorters,
    tableQuery: { refetch } = {},
  } = useTable<ClassTableRow>({
    resource: "classes",
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [
        {
          field: "name",
          order: "asc",
        },
      ],
    },
  });

  const {
    result: termsResponse,
    query: { isLoading: isLoadingTerms },
  } = useList<TermResource>({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 100 },
  });

  const terms = useMemo(() => termsResponse?.data ?? [], [termsResponse?.data]);

  const hasInitialFilter = useRef(false);
  useEffect(() => {
    if (hasInitialFilter.current) return;
    if (!terms || terms.length === 0) return;
    const activeTerm = terms.find(isTermActive);
    if (!activeTerm) return;
    setSelectedYear(activeTerm.year);
    setSelectedSemester(String(activeTerm.semester));
    hasInitialFilter.current = true;
  }, [terms]);

  const yearOptions = useMemo(() => {
    const uniqueYears = Array.from(new Set(terms.map((term) => term.year)));
    return uniqueYears.map((year) => ({ label: year, value: year }));
  }, [terms]);

  const matchingTermIds = useMemo(() => {
    if (!terms || terms.length === 0) return [];
    return terms
      .filter((term) => {
        const matchYear = selectedYear ? term.year === selectedYear : true;
        const matchSemester = selectedSemester ? String(term.semester) === selectedSemester : true;
        return matchYear && matchSemester;
      })
      .map((term) => term.id);
  }, [selectedYear, selectedSemester, terms]);

  useEffect(() => {
    const nextFilters: CrudFilter[] = [];

    if (selectedHomeroom) {
      nextFilters.push({
        field: "homeroomId",
        operator: "eq",
        value: selectedHomeroom,
      });
    }

    const trimmedSearch = searchValue.trim();
    if (trimmedSearch.length > 0) {
      nextFilters.push({
        field: "name",
        operator: "contains",
        value: trimmedSearch,
      });
    }

    if (matchingTermIds.length === 1) {
      nextFilters.push({
        field: "termId",
        operator: "eq",
        value: matchingTermIds[0],
      });
    } else if (matchingTermIds.length > 1) {
      nextFilters.push({
        field: "termId",
        operator: "in",
        value: matchingTermIds,
      });
    } else if (selectedYear || selectedSemester) {
      nextFilters.push({
        field: "termId",
        operator: "eq",
        value: "__no_match__",
      });
    }

    setFilters?.(nextFilters, "replace");
  }, [matchingTermIds, searchValue, selectedHomeroom, selectedSemester, selectedYear, setFilters]);

  const dataSource = useMemo(() => {
    const original = (tableProps.dataSource as ClassResource[] | undefined) ?? [];
    return original;
  }, [tableProps.dataSource]);

  const homeroomIds = useMemo(
    () =>
      Array.from(
        new Set(
          dataSource
            .map((klass) => klass.homeroomId)
            .filter((value): value is string => Boolean(value && value.length > 0))
        )
      ),
    [dataSource]
  );

  const {
    result: teachersResponse,
    query: { isLoading: isLoadingTeachers },
  } = useList<TeacherResource>({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const {
    result: homeroomResponse,
    query: { isLoading: isLoadingHomerooms },
  } = useMany<TeacherResource>({
    resource: "teachers",
    ids: homeroomIds,
    queryOptions: {
      enabled: homeroomIds.length > 0,
    },
  });

  const teacherOptions = useMemo(
    () =>
      (teachersResponse?.data ?? []).map((teacher) => ({
        label: teacher.fullName,
        value: teacher.id,
      })),
    [teachersResponse?.data]
  );

  const homeroomMap = useMemo(() => {
    const map = new Map<string, TeacherResource>();
    (homeroomResponse?.data ?? []).forEach((teacher) => {
      map.set(teacher.id, teacher);
    });
    return map;
  }, [homeroomResponse?.data]);

  const classIds = useMemo(() => dataSource.map((klass) => klass.id), [dataSource]);

  const enrollmentFilters = useMemo(() => {
    if (classIds.length === 0) {
      return undefined;
    }
    return [
      {
        field: "classId",
        operator: "in",
        value: classIds,
      } as CrudFilter,
    ];
  }, [classIds]);

  const {
    result: enrollmentResponse,

    query: { isLoading: isLoadingEnrollments, isFetching: isFetchingEnrollments },
  } = useList<EnrollmentResource>({
    resource: "enrollments",
    pagination: { currentPage: 1, pageSize: 1000 },
    filters: enrollmentFilters,
    queryOptions: {
      enabled: Boolean(enrollmentFilters),
      keepPreviousData: true,
    },
  });

  const enrollmentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (enrollmentResponse?.data ?? []).forEach((enrollment) => {
      const current = map.get(enrollment.classId) ?? 0;
      map.set(enrollment.classId, current + 1);
    });
    return map;
  }, [enrollmentResponse?.data]);

  const termMap = useMemo(() => {
    const map = new Map<string, TermResource>();
    terms.forEach((term) => {
      map.set(term.id, term);
    });
    return map;
  }, [terms]);

  const enrichedData: ClassTableRow[] = useMemo(
    () =>
      dataSource.map((klass) => {
        const teacher = klass.homeroomId ? homeroomMap.get(klass.homeroomId) : undefined;
        const term = klass.termId ? termMap.get(klass.termId) : undefined;
        const studentCount = enrollmentCountMap.get(klass.id) ?? 0;

        return {
          ...klass,
          homeroomName: teacher?.fullName,
          studentCount,
          termLabel: buildTermLabel(term),
          termName: term?.name,
        };
      }),
    [dataSource, homeroomMap, termMap, enrollmentCountMap]
  );

  const handleClearFilters = () => {
    setSelectedYear(undefined);
    setSelectedSemester(undefined);
    setSelectedHomeroom(undefined);
    setSearchValue("");
    setFilters?.([], "replace");
    setSorters?.([]);
  };

  const handleRowView = useCallback(
    (record: ClassResource) => {
      show("classes", record.id);
    },
    [show]
  );

  const handleRowEdit = useCallback(
    (record: ClassResource) => {
      edit("classes", record.id);
    },
    [edit]
  );

  const handleRowDelete = useCallback(
    (record: ClassResource) => {
      setDeletingId(record.id);
      deleteOne(
        { resource: "classes", id: record.id },
        {
          onSuccess: async () => {
            notify?.({
              type: "success",
              message: "Kelas dihapus",
              description: `${record.name} berhasil dihapus`,
            });
            setSelectedRowKeys((previous) =>
              previous.filter((selectedKey) => selectedKey !== record.id)
            );
            setDeletingId(null);
            await refetch?.();
          },
          onError: (error: any) => {
            notify?.({
              type: "error",
              message: "Gagal menghapus",
              description: error?.message ?? "Tidak dapat menghapus kelas.",
            });
            setDeletingId(null);
          },
        }
      );
    },
    [deleteOne, notify, refetch]
  );

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} kelas terpilih?`,
      content: "Tindakan ini akan menghapus data kelas dan tidak dapat dibatalkan.",
      okText: "Hapus",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      centered: true,
      onOk: async () => {
        setBulkLoading(true);
        const tasks = selectedRowKeys.map(
          (key) =>
            new Promise<void>((resolve, reject) => {
              deleteOne(
                { resource: "classes", id: String(key) },
                {
                  onSuccess: () => resolve(),
                  onError: (error: any) => reject(error),
                }
              );
            })
        );
        try {
          await Promise.all(tasks);
          notify?.({
            type: "success",
            message: "Kelas terhapus",
            description: `${selectedRowKeys.length} kelas berhasil dihapus.`,
          });
          setSelectedRowKeys([]);
          await refetch?.();
        } catch (error) {
          notify?.({
            type: "error",
            message: "Gagal menghapus kelas",
            description: error instanceof Error ? error.message : String(error),
          });
        } finally {
          setBulkLoading(false);
        }
      },
    });
  };

  const handleBulkAssignHomeroom = () => {
    if (selectedRowKeys.length === 0) return;
    notify?.({
      type: "info",
      message: "Assign wali kelas",
      description:
        "Fitur assign wali kelas massal dalam pengembangan. Silakan pilih kelas dan update satu per satu.",
    });
  };

  const handleBulkExport = () => {
    notify?.({
      type: "info",
      message: "Export CSV",
      description:
        selectedRowKeys.length > 0
          ? `Menyiapkan export ${selectedRowKeys.length} kelas terpilih.`
          : "Menyiapkan export seluruh kelas berdasarkan filter aktif.",
    });
  };

  const columns: ColumnsType<ClassTableRow> = useMemo(
    () => [
      {
        title: "Kode",
        dataIndex: "code",
        sorter: (a, b) => a.code.localeCompare(b.code),
        width: 120,
      },
      {
        title: "Nama",
        dataIndex: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: "Wali Kelas",
        dataIndex: "homeroomName",
        sorter: (a, b) => (a.homeroomName ?? "").localeCompare(b.homeroomName ?? ""),
        render: (value: string | undefined) => value ?? "-",
      },
      {
        title: "Jumlah Siswa",
        dataIndex: "studentCount",
        sorter: (a, b) => a.studentCount - b.studentCount,
        width: 140,
        render: (value: number) => <Tag color="blue">{value}</Tag>,
      },
      {
        title: "Term",
        dataIndex: "termLabel",
        sorter: (a, b) => (a.termLabel ?? "").localeCompare(b.termLabel ?? ""),
        render: (_: string | undefined, record) =>
          record.termLabel ? (
            <Tooltip title={record.termName}>
              <Tag color="purple">{record.termLabel}</Tag>
            </Tooltip>
          ) : (
            "-"
          ),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 160,
        render: (_: unknown, record) => (
          <Space>
            <Tooltip title="Detail kelas">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowView(record);
                }}
              />
            </Tooltip>
            <Tooltip title="Edit kelas">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowEdit(record);
                }}
              />
            </Tooltip>
            <Tooltip title="Hapus kelas">
              <Button
                type="text"
                danger
                loading={deletingId === record.id}
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowDelete(record);
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [deletingId, handleRowDelete, handleRowEdit, handleRowView]
  );

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys: React.Key[]) => {
        setSelectedRowKeys(keys);
      },
    }),
    [selectedRowKeys]
  );

  const isLoading =
    tableProps.loading ||
    isLoadingTerms ||
    isLoadingTeachers ||
    isLoadingHomerooms ||
    isLoadingEnrollments ||
    isFetchingEnrollments ||
    bulkLoading;

  return (
    <ResourceActionGuard action="list" resourceName="classes">
      <List
        title={
          <Space direction="vertical" size={4}>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              Daftar Kelas
            </Typography.Title>
            <Typography.Text type="secondary">
              Kelola kelas berdasarkan tahun ajar, semester, dan wali kelas yang bertanggung jawab.
            </Typography.Text>
          </Space>
        }
        headerProps={{ style: { marginBottom: 0 } }}
        contentProps={{ style: { padding: 0 } }}
      >
        <Space direction="vertical" size={24} style={{ width: "100%", padding: 24 }}>
          <Card style={enterpriseCardStyle}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Typography.Text strong>Pencarian & Filter</Typography.Text>
              <Space wrap style={{ width: "100%" }}>
                <Select
                  style={{ minWidth: 200 }}
                  placeholder="Tahun Ajar"
                  value={selectedYear}
                  options={yearOptions}
                  onChange={(value) => setSelectedYear(value)}
                  allowClear
                />
                <Select
                  style={{ minWidth: 220 }}
                  placeholder="Semester"
                  value={selectedSemester}
                  options={SEMESTER_OPTIONS}
                  onChange={(value) => setSelectedSemester(value)}
                  allowClear
                />
                <Select
                  style={{ minWidth: 220 }}
                  placeholder="Wali Kelas"
                  value={selectedHomeroom}
                  options={teacherOptions}
                  loading={isLoadingTeachers}
                  onChange={(value) => setSelectedHomeroom(value)}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
                <Input
                  style={{ minWidth: 240 }}
                  placeholder="Cari nama kelas"
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
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => create("classes")}>
                  Tambah Kelas
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() =>
                    notify?.({
                      type: "info",
                      message: "Import CSV",
                      description:
                        "Fitur import CSV kelas akan diintegrasikan dengan modul setup wizard.",
                    })
                  }
                >
                  Import CSV
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleBulkExport}>
                  Export CSV
                </Button>
              </Space>
              <Space>
                <Typography.Text type="secondary">
                  Terpilih: {selectedRowKeys.length}
                </Typography.Text>
                <Tooltip title="Assign wali kelas massal">
                  <Button
                    icon={<UserSwitchOutlined />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={handleBulkAssignHomeroom}
                  >
                    Assign Wali
                  </Button>
                </Tooltip>
                <Tooltip title="Export kelas terpilih">
                  <Button
                    icon={<DownloadOutlined />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={handleBulkExport}
                  >
                    Export Terpilih
                  </Button>
                </Tooltip>
                <Tooltip title="Hapus kelas terpilih">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedRowKeys.length === 0}
                    loading={bulkLoading}
                    onClick={handleBulkDelete}
                  >
                    Hapus Terpilih
                  </Button>
                </Tooltip>
              </Space>
            </Space>

            <Table<ClassTableRow>
              {...tableProps}
              rowSelection={rowSelection}
              size="small"
              columns={columns}
              dataSource={enrichedData}
              loading={isLoading}
              rowKey="id"
              onRow={(record) => ({
                onClick: () => handleRowView(record),
              })}
              pagination={tableProps.pagination}
            />
          </Card>
        </Space>
      </List>
    </ResourceActionGuard>
  );
};
