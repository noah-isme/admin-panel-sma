import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ApartmentOutlined,
  BarChartOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  ManOutlined,
  MoreOutlined,
  PlusOutlined,
  TeamOutlined,
  UploadOutlined,
  WomanOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TableProps, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useNavigation } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "../providers/dataProvider";

import type {
  StudentGenderCode,
  StudentRosterResponse,
  StudentRosterRow,
  StudentStatusCode,
  StudentRosterSortField,
} from "../types/student-roster";

const { RangePicker } = DatePicker;

const createImportIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `students-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ViewKey = "list" | "insights";

type FilterState = {
  classId?: string;
  status?: StudentStatusCode | "all";
  gender?: StudentGenderCode | "all";
  track?: string;
  guardian?: string;
};

const statusColorMap: Record<StudentStatusCode, string> = {
  active: "green",
  inactive: "volcano",
  alumni: "geekblue",
  graduated: "gold",
};

const genderIconMap: Record<StudentGenderCode, JSX.Element> = {
  M: <ManOutlined />,
  F: <WomanOutlined />,
};

const genderLabelMap: Record<StudentGenderCode, string> = {
  M: "Laki-laki",
  F: "Perempuan",
};

const fetchStudentRoster = async (params: Record<string, unknown>) => {
  const response = await httpClient.get<StudentRosterResponse>("/students/roster", { params });
  return (response.data as unknown as { data?: StudentRosterResponse }).data ?? response.data;
};

const formatDate = (value?: string) => (value ? dayjs(value).format("DD MMM YYYY") : "–");

const formatBirthYearRange = (range: [number | undefined, number | undefined]) => {
  const [start, end] = range;
  if (start && end) {
    return `Tahun ${start} – ${end}`;
  }
  if (start) {
    return `≥ ${start}`;
  }
  if (end) {
    return `≤ ${end}`;
  }
  return undefined;
};

const enterpriseCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  boxShadow: "none",
  borderRadius: 6,
};

export const StudentsPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [view, setView] = useState<ViewKey>("list");
  const [filtersState, setFiltersState] = useState<FilterState>({});
  const [birthYearRange, setBirthYearRange] = useState<[number | undefined, number | undefined]>([
    undefined,
    undefined,
  ]);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  const [sortState, setSortState] = useState<{
    field?: StudentRosterSortField;
    order?: "ascend" | "descend";
  }>({});

  const { create, edit, show } = useNavigation();
  const { open: notifyOpen } = useAppNotification();

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: pagination.current,
      perPage: pagination.pageSize,
    };
    if (filtersState.classId) params.classId = filtersState.classId;
    if (filtersState.status && filtersState.status !== "all") params.status = filtersState.status;
    if (filtersState.gender && filtersState.gender !== "all") params.gender = filtersState.gender;
    if (filtersState.track) params.track = filtersState.track;
    if (filtersState.guardian) params.guardian = filtersState.guardian;
    if (typeof birthYearRange[0] === "number") params.birthYearStart = birthYearRange[0];
    if (typeof birthYearRange[1] === "number") params.birthYearEnd = birthYearRange[1];
    if (searchQuery) params.search = searchQuery;
    if (sortState.field) {
      params.sortField = sortState.field;
      params.sortOrder = sortState.order ?? "ascend";
    }
    return params;
  }, [birthYearRange, filtersState, pagination, searchQuery, sortState.field, sortState.order]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["student-roster", queryParams],
    queryFn: () => fetchStudentRoster(queryParams),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!data) return;
    setPagination((prev) => {
      const next = {
        current: data.pagination.page,
        pageSize: data.pagination.perPage,
      };
      if (prev.current === next.current && prev.pageSize === next.pageSize) {
        return prev;
      }
      return next;
    });
  }, [data]);

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const filters = data?.filters;
  const totalRecords = data?.pagination.total ?? 0;

  const handleSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    setSearchQuery(trimmed);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      if (value === "") {
        handleSearch("");
      }
    },
    [handleSearch]
  );

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | undefined) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleBirthYearChange = useCallback((dates: null | (Dayjs | null)[]) => {
    if (!dates || dates.length !== 2) {
      setBirthYearRange([undefined, undefined]);
    } else {
      const [start, end] = dates;
      setBirthYearRange([start ? start.year() : undefined, end ? end.year() : undefined]);
    }
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFiltersState({});
    setBirthYearRange([undefined, undefined]);
    setSearchValue("");
    setSearchQuery("");
    setPagination({ current: 1, pageSize: pagination.pageSize });
    setSortState({});
  }, [pagination.pageSize]);

  const handleTableChange: TableProps<StudentRosterRow>["onChange"] = useCallback(
    (
      pager: TablePaginationConfig,
      _filters: Record<string, FilterValue | null>,
      sorter: SorterResult<StudentRosterRow> | SorterResult<StudentRosterRow>[]
    ) => {
      setPagination((prev) => ({
        current: pager.current ?? prev.current,
        pageSize: pager.pageSize ?? prev.pageSize,
      }));
      const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      if (normalizedSorter && normalizedSorter.field) {
        if (normalizedSorter.order) {
          setSortState({
            field: normalizedSorter.field as StudentRosterSortField,
            order: normalizedSorter.order as "ascend" | "descend",
          });
        } else {
          setSortState({});
        }
      }
    },
    []
  );

  const handleBulkAction = useCallback(
    (action: "import" | "export" | "bulk-status") => {
      if (action === "import") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,text/csv";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          void httpClient
            .post("/students/import", file, {
              headers: {
                "Content-Type": "text/csv",
                "Idempotency-Key": createImportIdempotencyKey(),
              },
            })
            .then(({ data }) => {
              const result =
                (data as { data?: { created?: number; failed?: number } }).data ?? data;
              message.success(
                `Import selesai: ${result.created ?? 0} dibuat, ${result.failed ?? 0} gagal.`
              );
            })
            .catch(() => message.error("Import CSV siswa gagal."));
        };
        input.click();
      } else if (action === "export") {
        const url = httpClient.getUri({ url: "/export/students", params: queryParams });
        window.location.href = url;
      } else {
        message.info("Perubahan status massal membutuhkan endpoint khusus.");
      }
    },
    [queryParams]
  );

  const handleRowAction = useCallback(
    (action: "view" | "edit" | "status", record: StudentRosterRow) => {
      if (action === "view") {
        show("students", record.id);
      } else if (action === "edit") {
        edit("students", record.id);
      } else {
        void httpClient
          .patch(`/students/${record.id}/status`, {
            status: record.status === "active" ? "inactive" : "active",
          })
          .then(() => message.success("Status siswa diperbarui"))
          .catch(() => message.error("Gagal memperbarui status siswa"));
      }
    },
    [edit, notifyOpen, show]
  );

  const columns: ColumnsType<StudentRosterRow> = useMemo(
    () => [
      {
        title: "NIS",
        dataIndex: "nis",
        key: "nis",
        width: 140,
        sorter: true,
        sortOrder: sortState.field === "nis" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: "Nama Lengkap",
        dataIndex: "fullName",
        key: "fullName",
        sorter: true,
        sortOrder: sortState.field === "fullName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (_value, record) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{record.fullName}</Typography.Text>
            <Space size={8}>
              <Tag color="blue">{record.className}</Tag>
              <Tag color={statusColorMap[record.status]}>{record.status.toUpperCase()}</Tag>
            </Space>
          </Space>
        ),
      },
      {
        title: "Jenis Kelamin",
        dataIndex: "gender",
        key: "gender",
        width: 160,
        render: (value: StudentGenderCode) => (
          <Space>
            {genderIconMap[value]}
            <Typography.Text>{genderLabelMap[value]}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Tanggal Lahir",
        dataIndex: "birthDate",
        key: "birthDate",
        width: 180,
        render: (value: string) => <Typography.Text>{formatDate(value)}</Typography.Text>,
      },
      {
        title: "Wali Murid",
        dataIndex: "guardianName",
        key: "guardian",
        render: (_value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{record.guardianName}</Typography.Text>
            <Typography.Text type="secondary">{record.guardianPhone}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Terakhir Diperbarui",
        dataIndex: "lastUpdated",
        key: "lastUpdated",
        width: 200,
        sorter: true,
        sortOrder: sortState.field === "lastUpdated" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: string) => <Typography.Text>{formatDate(value)}</Typography.Text>,
      },
      {
        title: "Aksi",
        key: "actions",
        width: 80,
        align: "center",
        render: (_value, record) => (
          <Dropdown
            menu={{
              items: [
                { key: "view", label: "Lihat profil" },
                { key: "edit", label: "Ubah data" },
                { type: "divider" as const },
                { key: "status", label: "Ubah status" },
              ],
              onClick: ({ key }) => handleRowAction(key as "view" | "edit" | "status", record),
            }}
            trigger={["click"]}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ],
    [handleRowAction, sortState.field, sortState.order]
  );

  const tablePagination = useMemo(
    () => ({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: totalRecords,
      showTotal: (total: number) => `${total} siswa`,
      showSizeChanger: true,
      pageSizeOptions: ["10", "12", "20", "50"],
    }),
    [pagination.current, pagination.pageSize, totalRecords]
  );

  const appliedFilterTags = useMemo(() => {
    const tags: Array<{ key: string; label: string }> = [];
    if (filtersState.classId) {
      const classLabel =
        filters?.classes.find((klass) => klass.id === filtersState.classId)?.label ??
        filtersState.classId;
      tags.push({ key: "class", label: `Kelas: ${classLabel}` });
    }
    if (filtersState.status) {
      tags.push({ key: "status", label: `Status: ${filtersState.status.toUpperCase()}` });
    }
    if (filtersState.gender) {
      const genderLabel =
        filtersState.gender === "all" ? "Semua" : genderLabelMap[filtersState.gender];
      tags.push({
        key: "gender",
        label: `Gender: ${genderLabel}`,
      });
    }
    if (filtersState.track) {
      tags.push({ key: "track", label: `Program: ${filtersState.track}` });
    }
    if (filtersState.guardian) {
      tags.push({ key: "guardian", label: `Wali: ${filtersState.guardian}` });
    }
    const birthLabel = formatBirthYearRange(birthYearRange);
    if (birthLabel) {
      tags.push({ key: "birthYear", label: birthLabel });
    }
    if (searchQuery) {
      tags.push({ key: "search", label: `Cari: “${searchQuery}”` });
    }
    return tags;
  }, [birthYearRange, filters?.classes, filtersState, searchQuery]);

  const renderMobileCards = useCallback(() => {
    if (rows.length === 0) {
      return <Empty description="Belum ada siswa sesuai filter" />;
    }
    return (
      <List
        dataSource={rows}
        renderItem={(record) => (
          <List.Item key={record.id}>
            <Card style={{ width: "100%", ...enterpriseCardStyle }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Space direction="vertical" size={2}>
                  <Typography.Text strong>{record.fullName}</Typography.Text>
                  <Typography.Text type="secondary">
                    {record.className} • NIS {record.nis}
                  </Typography.Text>
                </Space>
                <Divider style={{ margin: "12px 0" }} />
                <Space direction="vertical" size={2}>
                  <Typography.Text>
                    {genderIconMap[record.gender]} {genderLabelMap[record.gender]}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Lahir: {formatDate(record.birthDate)}
                  </Typography.Text>
                </Space>
                <Space direction="vertical" size={2}>
                  <Typography.Text>Wali: {record.guardianName}</Typography.Text>
                  <Typography.Text type="secondary">{record.guardianPhone}</Typography.Text>
                </Space>
                <Flex justify="space-between" align="center" gap="small">
                  <Tag color={statusColorMap[record.status]}>{record.status.toUpperCase()}</Tag>
                  <Dropdown
                    menu={{
                      items: [
                        { key: "view", label: "Lihat profil" },
                        { key: "edit", label: "Ubah data" },
                        { type: "divider" as const },
                        { key: "status", label: "Ubah status" },
                      ],
                      onClick: ({ key }) =>
                        handleRowAction(key as "view" | "edit" | "status", record),
                    }}
                    trigger={["click"]}
                  >
                    <Button icon={<MoreOutlined />} />
                  </Dropdown>
                </Flex>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    );
  }, [handleRowAction, rows]);

  const renderTable = useMemo(() => {
    if (isMobile) {
      return renderMobileCards();
    }
    return (
      <Table<StudentRosterRow>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={isFetching && rows.length === 0}
        pagination={tablePagination}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />
    );
  }, [columns, handleTableChange, isFetching, isMobile, renderMobileCards, rows, tablePagination]);

  return (
    <Spin spinning={isLoading && !data}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            Data Siswa SMA Harapan Nusantara
          </Typography.Title>
          <Typography.Text type="secondary">
            Tahun Pelajaran 2024/2025 • Semester Ganjil
          </Typography.Text>
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card style={enterpriseCardStyle}>
              <Statistic
                title="Total siswa"
                value={summary?.totalStudents ?? 0}
                prefix={<TeamOutlined />}
              />
              <Typography.Text type="secondary">
                Aktif: {summary?.activeStudents ?? 0} • Non-aktif: {summary?.inactiveStudents ?? 0}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={enterpriseCardStyle}>
              <Statistic
                title="Tingkat keaktifan"
                suffix="%"
                value={summary?.activeRate ?? 0}
                precision={1}
                prefix={<BarChartOutlined />}
              />
              <Progress
                percent={summary?.activeRate ?? 0}
                status="active"
                strokeColor="#16a34a"
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={enterpriseCardStyle}>
              <Typography.Text strong>Distribusi gender</Typography.Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                {summary?.genderBreakdown.map((entry) => (
                  <Space key={entry.gender} align="center">
                    <Tag icon={genderIconMap[entry.gender]} color="blue">
                      {genderLabelMap[entry.gender]}
                    </Tag>
                    <Typography.Text>{entry.count} siswa</Typography.Text>
                  </Space>
                )) ?? <Typography.Text type="secondary">Data belum tersedia</Typography.Text>}
              </Space>
            </Card>
          </Col>
        </Row>

        <Card style={enterpriseCardStyle}>
          <Row
            gutter={[16, 16]}
            justify="space-between"
            align="middle"
            style={{ marginBottom: 16 }}
          >
            <Col>
              <Space wrap>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => create("students")}>
                  Tambah siswa
                </Button>
                <Button icon={<UploadOutlined />} onClick={() => handleBulkAction("import")}>
                  Import CSV
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleBulkAction("export")}>
                  Export Excel
                </Button>
                <Button icon={<EditOutlined />} onClick={() => handleBulkAction("bulk-status")}>
                  Ubah status massal
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Refresh data">
                  <Button icon={<FilterOutlined />} onClick={() => refetch()} loading={isFetching}>
                    Muat ulang
                  </Button>
                </Tooltip>
                <Button onClick={handleResetFilters}>Reset filter</Button>
              </Space>
            </Col>
          </Row>
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            wrap
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space wrap>
              <Select
                allowClear
                placeholder="Kelas"
                value={filtersState.classId}
                onChange={(value) => handleFilterChange("classId", value)}
                style={{ minWidth: 180 }}
                options={filters?.classes.map((klass) => ({
                  value: klass.id,
                  label: klass.label,
                }))}
              />
              <Select
                allowClear
                placeholder="Status"
                value={filtersState.status}
                onChange={(value) =>
                  handleFilterChange(
                    "status",
                    value && value !== "all" ? (value as StudentStatusCode) : undefined
                  )
                }
                style={{ minWidth: 160 }}
                options={filters?.statuses.map((status) => ({
                  value: status.value,
                  label: status.label,
                }))}
              />
              <Select
                allowClear
                placeholder="Gender"
                value={filtersState.gender}
                onChange={(value) =>
                  handleFilterChange(
                    "gender",
                    value && value !== "all" ? (value as StudentGenderCode) : undefined
                  )
                }
                style={{ minWidth: 160 }}
                options={filters?.genders.map((gender) => ({
                  value: gender.value,
                  label: gender.label,
                }))}
              />
              <Select
                allowClear
                placeholder="Program"
                value={filtersState.track}
                onChange={(value) => handleFilterChange("track", value)}
                style={{ minWidth: 160 }}
                options={filters?.tracks.map((track) => ({
                  value: track.value,
                  label: track.label,
                }))}
              />
              <Select
                allowClear
                showSearch
                placeholder="Nama wali murid"
                value={filtersState.guardian}
                onChange={(value) => handleFilterChange("guardian", value)}
                style={{ minWidth: 200 }}
                options={filters?.guardians}
                optionFilterProp="label"
              />
            </Space>
            <Space wrap>
              <RangePicker
                picker="year"
                allowClear
                onChange={handleBirthYearChange}
                value={[
                  birthYearRange[0] ? dayjs(String(birthYearRange[0]), "YYYY") : null,
                  birthYearRange[1] ? dayjs(String(birthYearRange[1]), "YYYY") : null,
                ]}
              />
              <Input.Search
                allowClear
                placeholder="Cari NIS / nama / wali"
                value={searchValue}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                style={{ width: isMobile ? "100%" : 240 }}
              />
            </Space>
          </Space>
          {appliedFilterTags.length > 0 ? (
            <>
              <Divider />
              <Space wrap>
                {appliedFilterTags.map((tag) => (
                  <Tag key={tag.key} color="blue">
                    {tag.label}
                  </Tag>
                ))}
              </Space>
            </>
          ) : null}
        </Card>

        <Segmented
          block={isMobile}
          options={[
            { label: "Daftar siswa", value: "list" as const },
            { label: "Analitik", value: "insights" as const, icon: <ApartmentOutlined /> },
          ]}
          value={view}
          onChange={(value) => setView(value as ViewKey)}
        />

        {view === "insights" ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card title="Sebaran kelas" style={enterpriseCardStyle}>
              {summary?.classDistribution.length ? (
                <List
                  dataSource={summary.classDistribution}
                  renderItem={(item) => (
                    <List.Item key={item.classId}>
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Typography.Text>{item.className}</Typography.Text>
                        <Tag color="blue">{item.count} siswa</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Belum ada data sebaran kelas" />
              )}
            </Card>
            <Card title="Status siswa" style={enterpriseCardStyle}>
              <Row gutter={[16, 16]}>
                {summary?.statusBreakdown.map((status) => (
                  <Col xs={24} sm={12} md={6} key={status.status}>
                    <Card style={enterpriseCardStyle}>
                      <Statistic
                        title={status.label}
                        value={status.count}
                        valueStyle={{ color: statusColorMap[status.status] ?? "inherit" }}
                      />
                    </Card>
                  </Col>
                )) ?? (
                  <Col span={24}>
                    <Empty description="Belum ada data status" />
                  </Col>
                )}
              </Row>
            </Card>
          </Space>
        ) : (
          <Card title="Daftar siswa" style={enterpriseCardStyle}>
            {renderTable}
          </Card>
        )}
      </Space>
    </Spin>
  );
};
