import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  BookOutlined,
  CalendarOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
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
import { useNavigation } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { httpClient } from "../providers/dataProvider";
import { downloadCsv } from "../utils/csv";
import type {
  TeacherAvailabilityLevel,
  TeacherRosterResponse,
  TeacherRosterRow,
  TeacherRosterSortField,
  TeacherStatusCode,
} from "../types/teacher-roster";

type ViewKey = "list" | "insights";

const createImportIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `teachers-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type FilterState = {
  subjectId?: string;
  status?: TeacherStatusCode | "all";
  track?: string;
  availability?: TeacherAvailabilityLevel | "all";
  homeroomClassId?: string;
};

const statusColorMap: Record<TeacherStatusCode, string> = {
  active: "green",
  inactive: "volcano",
  on_leave: "purple",
};

const availabilityColorMap: Record<TeacherAvailabilityLevel, string> = {
  HIGH: "green",
  MEDIUM: "gold",
  LOW: "volcano",
};

const availabilityLabelMap: Record<TeacherAvailabilityLevel, string> = {
  HIGH: "Sangat tersedia",
  MEDIUM: "Cukup tersedia",
  LOW: "Terbatas",
};

const fetchTeacherRoster = async (params: Record<string, unknown>) => {
  const response = await httpClient.get<TeacherRosterResponse>("/teachers/roster", { params });
  return (response.data as unknown as { data?: TeacherRosterResponse }).data ?? response.data;
};

const enterpriseCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  boxShadow: "none",
  borderRadius: 6,
};

export const TeachersPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [view, setView] = useState<ViewKey>("list");
  const [filtersState, setFiltersState] = useState<FilterState>({});
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  const [sortState, setSortState] = useState<{
    field?: TeacherRosterSortField;
    order?: "ascend" | "descend";
  }>({});

  const { create, edit, show } = useNavigation();
  const { open: notifyOpen } = useAppNotification();

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: pagination.current,
      perPage: pagination.pageSize,
    };
    if (filtersState.subjectId) params.subjectId = filtersState.subjectId;
    if (filtersState.status && filtersState.status !== "all") params.status = filtersState.status;
    if (filtersState.track) params.track = filtersState.track;
    if (filtersState.availability && filtersState.availability !== "all")
      params.availability = filtersState.availability;
    if (filtersState.homeroomClassId) params.homeroomClassId = filtersState.homeroomClassId;
    if (searchQuery) params.search = searchQuery;
    if (sortState.field) {
      params.sortField = sortState.field;
      params.sortOrder = sortState.order ?? "ascend";
    }
    return params;
  }, [filtersState, pagination, searchQuery, sortState.field, sortState.order]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["teacher-roster", queryParams],
    queryFn: () => fetchTeacherRoster(queryParams),
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

  const handleResetFilters = useCallback(() => {
    setFiltersState({});
    setSearchValue("");
    setSearchQuery("");
    setPagination({ current: 1, pageSize: pagination.pageSize });
    setSortState({});
  }, [pagination.pageSize]);

  const handleTableChange: TableProps<TeacherRosterRow>["onChange"] = useCallback(
    (
      pager: TablePaginationConfig,
      _filters: Record<string, FilterValue | null>,
      sorter: SorterResult<TeacherRosterRow> | SorterResult<TeacherRosterRow>[]
    ) => {
      setPagination((prev) => ({
        current: pager.current ?? prev.current,
        pageSize: pager.pageSize ?? prev.pageSize,
      }));
      const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      if (normalizedSorter && normalizedSorter.field) {
        if (normalizedSorter.order) {
          setSortState({
            field: normalizedSorter.field as TeacherRosterSortField,
            order: normalizedSorter.order as "ascend" | "descend",
          });
        } else {
          setSortState({});
        }
      }
    },
    []
  );

  const handleBulkAction = useCallback((action: "import" | "export") => {
    if (action === "import") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,text/csv";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        void httpClient
          .post("/teachers/import", file, {
            headers: {
              "Content-Type": "text/csv",
              "Idempotency-Key": createImportIdempotencyKey(),
            },
          })
          .then(({ data }) => {
            const result = (data as { data?: { created?: number; failed?: number } }).data ?? data;
            message.success(
              `Import selesai: ${result.created ?? 0} dibuat, ${result.failed ?? 0} gagal.`
            );
          })
          .catch(() => message.error("Import CSV guru gagal."));
      };
      input.click();
    } else {
      downloadCsv(
        "teachers.csv",
        rows.map(({ id, nip, fullName, email, phone, status, assignmentCount }) => ({
          id,
          nip,
          fullName,
          email,
          phone,
          status,
          assignmentCount,
        }))
      );
    }
  }, []);

  const handleRowAction = useCallback(
    (action: "view" | "edit" | "status", record: TeacherRosterRow) => {
      if (action === "view") {
        show("teachers", record.id);
      } else if (action === "edit") {
        edit("teachers", record.id);
      } else {
        void httpClient
          .patch(`/teachers/${record.id}/status`, { active: record.status !== "active" })
          .then(() => message.success("Status guru diperbarui"))
          .catch(() => message.error("Gagal memperbarui status guru"));
      }
    },
    [edit, notifyOpen, show]
  );

  const columns: ColumnsType<TeacherRosterRow> = useMemo(
    () => [
      {
        title: "NIP",
        dataIndex: "nip",
        key: "nip",
        width: 170,
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: "Nama Guru",
        dataIndex: "fullName",
        key: "fullName",
        sorter: true,
        sortOrder: sortState.field === "fullName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (_value, record) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{record.fullName}</Typography.Text>
            <Typography.Text type="secondary">{record.email}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Mapel Utama",
        dataIndex: "mainSubjectName",
        key: "mainSubjectName",
        sorter: true,
        sortOrder: sortState.field === "mainSubjectName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: string | undefined, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{value ?? "Belum ditetapkan"}</Typography.Text>
            <Typography.Text type="secondary">
              Kelas diampu: {record.assignmentCount}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Kontak",
        dataIndex: "phone",
        key: "phone",
        render: (_value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{record.phone}</Typography.Text>
            <Typography.Text type="secondary">
              Homeroom: {record.homeroomClassName ?? "—"}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Kelas diampu",
        dataIndex: "assignmentCount",
        key: "assignmentCount",
        width: 160,
        sorter: true,
        sortOrder: sortState.field === "assignmentCount" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: number, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary">
              Program: {record.tracks.length > 0 ? record.tracks.join(", ") : "—"}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        sorter: true,
        sortOrder: sortState.field === "status" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: TeacherStatusCode) => (
          <Tag color={statusColorMap[value]}>{value.toUpperCase()}</Tag>
        ),
      },
      {
        title: "Ketersediaan",
        dataIndex: "availability",
        key: "availability",
        sorter: true,
        sortOrder: sortState.field === "availability" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: TeacherAvailabilityLevel | null) =>
          value ? (
            <Tag color={availabilityColorMap[value]}>{availabilityLabelMap[value]}</Tag>
          ) : (
            <Tag icon={<InboxOutlined />} color="default">
              Belum diatur
            </Tag>
          ),
      },
      {
        title: "Terakhir Diperbarui",
        dataIndex: "lastUpdated",
        key: "lastUpdated",
        sorter: true,
        sortOrder: sortState.field === "lastUpdated" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: string) => (
          <Typography.Text>{dayjs(value).format("DD MMM YYYY")}</Typography.Text>
        ),
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
      showTotal: (total: number) => `${total} guru`,
      showSizeChanger: true,
      pageSizeOptions: ["10", "12", "20", "50"],
    }),
    [pagination.current, pagination.pageSize, totalRecords]
  );

  const appliedFilterTags = useMemo(() => {
    const tags: Array<{ key: string; label: string }> = [];
    if (filtersState.subjectId) {
      const subjectLabel =
        filters?.subjects.find((subject) => subject.id === filtersState.subjectId)?.label ??
        filtersState.subjectId;
      tags.push({ key: "subject", label: `Mapel: ${subjectLabel}` });
    }
    if (filtersState.status) {
      tags.push({ key: "status", label: `Status: ${filtersState.status.toUpperCase()}` });
    }
    if (filtersState.track) {
      tags.push({ key: "track", label: `Program: ${filtersState.track}` });
    }
    if (filtersState.availability) {
      const availabilityLabel =
        filtersState.availability === "all"
          ? "Semua"
          : availabilityLabelMap[filtersState.availability];
      tags.push({
        key: "availability",
        label: `Ketersediaan: ${availabilityLabel}`,
      });
    }
    if (filtersState.homeroomClassId) {
      const homeroomLabel =
        filters?.homerooms.find((item) => item.id === filtersState.homeroomClassId)?.label ??
        filtersState.homeroomClassId;
      tags.push({ key: "homeroom", label: `Wali: ${homeroomLabel}` });
    }
    if (searchQuery) {
      tags.push({ key: "search", label: `Cari: “${searchQuery}”` });
    }
    return tags;
  }, [filters?.homerooms, filters?.subjects, filtersState, searchQuery]);

  const renderMobileCards = useCallback(() => {
    if (rows.length === 0) {
      return <Empty description="Belum ada guru sesuai filter" />;
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
                    NIP {record.nip} • {record.mainSubjectName ?? "Belum ditetapkan"}
                  </Typography.Text>
                </Space>
                <Divider style={{ margin: "12px 0" }} />
                <Space direction="vertical" size={2}>
                  <Typography.Text>{record.email}</Typography.Text>
                  <Typography.Text type="secondary">{record.phone}</Typography.Text>
                </Space>
                <Space direction="vertical" size={2}>
                  <Typography.Text>
                    Kelas diampu: {record.assignmentCount} • Program:{" "}
                    {record.tracks.length > 0 ? record.tracks.join(", ") : "—"}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Wali kelas: {record.homeroomClassName ?? "—"}
                  </Typography.Text>
                </Space>
                <Flex justify="space-between" align="center" gap="small">
                  <Space>
                    <Tag color={statusColorMap[record.status]}>{record.status.toUpperCase()}</Tag>
                    {record.availability ? (
                      <Tag color={availabilityColorMap[record.availability]}>
                        {availabilityLabelMap[record.availability]}
                      </Tag>
                    ) : null}
                  </Space>
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
      <Table<TeacherRosterRow>
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
            Data Guru SMA Harapan Nusantara
          </Typography.Title>
          <Typography.Text type="secondary">Tahun Pelajaran 2024/2025</Typography.Text>
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card style={enterpriseCardStyle}>
              <Statistic
                title="Total guru"
                value={summary?.totalTeachers ?? 0}
                prefix={<TeamOutlined />}
              />
              <Typography.Text type="secondary">
                Aktif: {summary?.activeTeachers ?? 0} • Non-aktif: {summary?.inactiveTeachers ?? 0}
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
                prefix={<CalendarOutlined />}
              />
              <Progress
                percent={summary?.activeRate ?? 0}
                status="active"
                strokeColor="#0ea5e9"
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={enterpriseCardStyle}>
              <Statistic
                title="Guru wali kelas"
                value={summary?.homeroomTeachers ?? 0}
                prefix={<BookOutlined />}
              />
              <Typography.Text type="secondary">
                Mapel utama terbanyak:{" "}
                {summary?.subjectDistribution?.[0]?.subjectName ?? "Belum tersedia"}
              </Typography.Text>
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
                <Button type="primary" icon={<PlusOutlined />} onClick={() => create("teachers")}>
                  Tambah guru
                </Button>
                <Button icon={<UploadOutlined />} onClick={() => handleBulkAction("import")}>
                  Import CSV
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleBulkAction("export")}>
                  Export Excel
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() =>
                    notifyOpen?.({
                      type: "info",
                      message: "Fitur mendatang",
                      description: "Penugasan massal akan hadir setelah integrasi backend siap.",
                    })
                  }
                >
                  Atur penugasan massal
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Muat ulang data">
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
                placeholder="Mapel utama"
                value={filtersState.subjectId}
                onChange={(value) => handleFilterChange("subjectId", value)}
                style={{ minWidth: 200 }}
                options={filters?.subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.label,
                }))}
              />
              <Select
                allowClear
                placeholder="Status"
                value={filtersState.status}
                onChange={(value) =>
                  handleFilterChange(
                    "status",
                    value && value !== "all" ? (value as TeacherStatusCode) : undefined
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
                placeholder="Ketersediaan"
                value={filtersState.availability}
                onChange={(value) =>
                  handleFilterChange(
                    "availability",
                    value && value !== "all" ? (value as TeacherAvailabilityLevel) : undefined
                  )
                }
                style={{ minWidth: 180 }}
                options={filters?.availabilities.map((availability) => ({
                  value: availability.value,
                  label: availability.label,
                }))}
              />
              <Select
                allowClear
                placeholder="Wali kelas"
                value={filtersState.homeroomClassId}
                onChange={(value) => handleFilterChange("homeroomClassId", value)}
                style={{ minWidth: 200 }}
                options={filters?.homerooms}
              />
            </Space>
            <Input.Search
              allowClear
              placeholder="Cari nama / NIP / email"
              value={searchValue}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              style={{ width: isMobile ? "100%" : 260 }}
            />
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
            { label: "Daftar guru", value: "list" as const },
            { label: "Analitik", value: "insights" as const },
          ]}
          value={view}
          onChange={(value) => setView(value as ViewKey)}
        />

        {view === "insights" ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card title="Sebaran mata pelajaran" style={enterpriseCardStyle}>
              {summary?.subjectDistribution.length ? (
                <List
                  dataSource={summary.subjectDistribution}
                  renderItem={(item) => (
                    <List.Item key={item.subjectId}>
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Typography.Text>{item.subjectName}</Typography.Text>
                        <Tag color="blue">{item.count} guru</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Belum ada data mapel utama" />
              )}
            </Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Program studi yang diampu" style={enterpriseCardStyle}>
                  {summary?.trackDistribution.length ? (
                    <List
                      dataSource={summary.trackDistribution}
                      renderItem={(item) => (
                        <List.Item key={item.track}>
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Typography.Text>{item.track}</Typography.Text>
                            <Tag color="geekblue">{item.count} guru</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="Belum ada distribusi program" />
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Ketersediaan guru" style={enterpriseCardStyle}>
                  {summary?.availabilityBreakdown.length ? (
                    <List
                      dataSource={summary.availabilityBreakdown}
                      renderItem={(item) => (
                        <List.Item key={item.level}>
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Typography.Text>{availabilityLabelMap[item.level]}</Typography.Text>
                            <Tag color={availabilityColorMap[item.level]}>{item.count}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="Belum ada data preferensi guru" />
                  )}
                </Card>
              </Col>
            </Row>
          </Space>
        ) : (
          <Card title="Daftar guru" style={enterpriseCardStyle}>
            {renderTable}
          </Card>
        )}
      </Space>
    </Spin>
  );
};
