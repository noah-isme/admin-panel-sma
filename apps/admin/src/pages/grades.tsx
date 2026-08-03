import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AimOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  MoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  TrophyOutlined,
  WarningOutlined,
  CloseCircleFilled,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Empty,
  Grid,
  Input,
  InputNumber,
  List,
  type MenuProps,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useDelete, useNavigation, useNotification } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { downloadCsv } from "../utils/csv";
import { httpClient } from "../providers/dataProvider";
import type { GradeReportResponse, GradeReportRow, GradeStatusCode } from "../types/grade-report";

type TabKey = "list" | "distribution" | "export";

type FilterState = {
  termId?: string;
  classId?: string;
  subjectId?: string;
  componentId?: string;
  teacherId?: string;
  status: GradeStatusCode | "ALL";
};

const initialFilterState: FilterState = {
  termId: undefined,
  classId: undefined,
  subjectId: undefined,
  componentId: undefined,
  teacherId: undefined,
  status: "ALL",
};

const toneColorMap: Record<GradeReportRow["status"]["tone"], string> = {
  success: "#0f766e",
  warning: "#d97706",
  danger: "#dc2626",
};

const statusIconMap: Record<GradeReportRow["status"]["icon"], JSX.Element> = {
  check: <CheckCircleFilled />,
  alert: <ExclamationCircleFilled />,
  x: <CloseCircleFilled />,
};

const tabOptions = [
  { label: "Daftar Nilai", value: "list" as const, icon: <AppstoreOutlined /> },
  { label: "Distribusi", value: "distribution" as const, icon: <BarChartOutlined /> },
  { label: "Cetak Laporan", value: "export" as const, icon: <DownloadOutlined /> },
];

const fetchGradeReport = async (params: Record<string, unknown>) => {
  const response = await httpClient.get<GradeReportResponse>("/grades/report", { params });
  return (response.data as unknown as { data?: GradeReportResponse }).data ?? response.data;
};

const formatDate = (value?: string) =>
  value ? dayjs(value).format("DD MMM YYYY") : "Belum tercatat";

const resolveDefaultOrder = (field: keyof GradeReportRow) =>
  field === "score" || field === "lastUpdated" ? "descend" : "ascend";

export const GradesPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [view, setView] = useState<TabKey>("list");
  const [filtersState, setFiltersState] = useState<FilterState>(initialFilterState);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreMin, setScoreMin] = useState<number | undefined>();
  const [scoreMax, setScoreMax] = useState<number | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [sortState, setSortState] = useState<{
    field?: keyof GradeReportRow;
    order?: "ascend" | "descend";
  }>({ field: undefined, order: undefined });

  const { show, edit } = useNavigation();
  const { mutate: deleteOne, isLoading: isDeleting } = useDelete();
  const { open: notifyOpen } = useNotification();

  const queryParams = useMemo(() => {
    const statusParam = filtersState.status === "ALL" ? undefined : filtersState.status;
    const params: Record<string, unknown> = {
      termId: filtersState.termId,
      classId: filtersState.classId,
      subjectId: filtersState.subjectId,
      componentId: filtersState.componentId,
      teacherId: filtersState.teacherId,
      status: statusParam,
      page: pagination.current,
      perPage: pagination.pageSize,
    };

    if (searchQuery) {
      params.search = searchQuery;
    }
    if (typeof scoreMin === "number") {
      params.scoreMin = scoreMin;
    }
    if (typeof scoreMax === "number") {
      params.scoreMax = scoreMax;
    }
    if (sortState.field) {
      params.sortField = sortState.field;
      params.sortOrder = sortState.order ?? "ascend";
    }

    return params;
  }, [filtersState, pagination, scoreMin, scoreMax, searchQuery, sortState]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["grade-report", queryParams],
    queryFn: () => fetchGradeReport(queryParams),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!data || isInitialized) return;
    const context = data.context;
    if (!context) {
      setIsInitialized(true);
      return;
    }
    if (
      filtersState.termId ||
      filtersState.classId ||
      filtersState.subjectId ||
      filtersState.teacherId
    ) {
      setIsInitialized(true);
      return;
    }
    setFiltersState((prev) => ({
      ...prev,
      termId: context.termId ?? undefined,
      classId: context.classId ?? undefined,
      subjectId: context.subjectId ?? undefined,
      teacherId: context.teacherId ?? undefined,
    }));
    setIsInitialized(true);
  }, [data, filtersState, isInitialized]);

  useEffect(() => {
    if (!data) return;
    setPagination((prev) => {
      if (prev.current === data.pagination.page && prev.pageSize === data.pagination.perPage) {
        return prev;
      }
      return {
        current: data.pagination.page,
        pageSize: data.pagination.perPage,
      };
    });
  }, [data]);

  const rows = data?.rows ?? [];
  const filters = data?.filters;
  const summary = data?.summary;
  const context = data?.context;
  const distribution = summary?.distribution ?? [];

  const totalRecords = data?.pagination.total ?? 0;

  const sortingOptions = useMemo(
    () => [
      { value: "score", label: "Nilai" },
      { value: "studentName", label: "Nama siswa" },
      { value: "subjectName", label: "Mata pelajaran" },
      { value: "componentName", label: "Komponen" },
      { value: "lastUpdated", label: "Terakhir diperbarui" },
    ],
    []
  );

  const summaryCards = useMemo(
    () => [
      {
        key: "average",
        title: "🎯 Rata-rata kelas",
        value: typeof summary?.averageScore === "number" ? summary.averageScore.toFixed(1) : "–",
        tone: "#2563eb",
        helper: context?.className ? `Kelas ${context.className}` : undefined,
        icon: <AimOutlined />,
      },
      {
        key: "highest",
        title: "🏆 Nilai tertinggi",
        value: summary?.highestScore ? `${summary.highestScore.score.toFixed(0)}` : "–",
        tone: "#15803d",
        helper: summary?.highestScore
          ? `${summary.highestScore.studentName} • ${summary.highestScore.componentName}`
          : "Belum ada data",
        icon: <TrophyOutlined />,
      },
      {
        key: "below",
        title: "⚠️ Di bawah KKM",
        value: summary?.belowKkmCount ?? 0,
        tone: "#dc2626",
        helper:
          summary && summary.remedialCount ? `${summary.remedialCount} butuh remedial` : undefined,
        icon: <WarningOutlined />,
      },
      {
        key: "components",
        title: "📄 Komponen penilaian",
        value: summary?.componentCount ?? 0,
        tone: "#6b7280",
        helper:
          summary && summary.lowestScore
            ? `Terendah ${summary.lowestScore.score} (${summary.lowestScore.studentName})`
            : undefined,
        icon: <AppstoreOutlined />,
      },
    ],
    [summary, context]
  );

  const toneTag = useCallback(
    (record: GradeReportRow) => (
      <Tag
        color={toneColorMap[record.status.tone]}
        icon={statusIconMap[record.status.icon]}
        style={{ marginRight: 0 }}
      >
        {record.status.label}
      </Tag>
    ),
    []
  );

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | undefined) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleStatusChange = useCallback((value: GradeStatusCode | "ALL") => {
    setFiltersState((prev) => ({
      ...prev,
      status: value,
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleScoreMinChange = useCallback((value: number | null) => {
    setScoreMin(typeof value === "number" ? value : undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleScoreMaxChange = useCallback((value: number | null) => {
    setScoreMax(typeof value === "number" ? value : undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

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

  const handleSortFieldChange = useCallback((value: string | null | undefined) => {
    if (!value) {
      setSortState({ field: undefined, order: undefined });
      setPagination((prev) => ({ ...prev, current: 1 }));
      return;
    }
    const field = value as keyof GradeReportRow;
    setSortState((prev) => {
      const nextOrder =
        prev.field === field && prev.order ? prev.order : resolveDefaultOrder(field);
      return { field, order: nextOrder };
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleSortOrderToggle = useCallback(() => {
    setSortState((prev) => {
      if (!prev.field) {
        return prev;
      }
      const nextOrder = prev.order === "descend" ? "ascend" : "descend";
      return { field: prev.field, order: nextOrder };
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFiltersState(initialFilterState);
    setSearchValue("");
    setSearchQuery("");
    setScoreMin(undefined);
    setScoreMax(undefined);
    setPagination({ current: 1, pageSize: pagination.pageSize });
    setSortState({ field: undefined, order: undefined });
  }, [pagination.pageSize]);

  type ActionKey = "view" | "edit" | "delete";

  const handleDeleteRow = useCallback(
    (record: GradeReportRow) => {
      Modal.confirm({
        title: `Hapus nilai ${record.studentName}?`,
        content:
          "Nilai akan disembunyikan dari daftar. Masukkan nilai kembali untuk memulihkannya.",
        okText: "Hapus",
        cancelText: "Batal",
        okButtonProps: { danger: true, loading: isDeleting },
        onOk: () =>
          new Promise<void>((resolve, reject) => {
            deleteOne(
              { resource: "grades", id: record.id },
              {
                onSuccess: () => {
                  notifyOpen?.({
                    type: "success",
                    message: "Nilai dihapus",
                    description: `${record.studentName} • ${record.componentName}`,
                  });
                  void refetch();
                  resolve();
                },
                onError: (error: any) => {
                  notifyOpen?.({
                    type: "error",
                    message: "Gagal menghapus",
                    description: error?.message ?? "Tidak dapat menghapus nilai.",
                  });
                  reject(error);
                },
              }
            );
          }),
      });
    },
    [deleteOne, isDeleting, notifyOpen, refetch]
  );

  const handleRowAction = useCallback(
    (action: ActionKey, record: GradeReportRow) => {
      if (action === "view") {
        show("grades", record.id);
      } else if (action === "edit") {
        edit("grades", record.id);
      } else if (action === "delete") {
        handleDeleteRow(record);
      }
    },
    [edit, handleDeleteRow, show]
  );

  const actionMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "view",
        label: "Lihat detail",
        icon: <EyeOutlined />,
      },
      {
        key: "edit",
        label: "Ubah nilai",
        icon: <EditOutlined />,
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Hapus nilai",
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    []
  );

  const columns: ColumnsType<GradeReportRow> = useMemo(
    () => [
      {
        title: "Siswa",
        dataIndex: "studentName",
        key: "student",
        sorter: true,
        sortOrder: sortState.field === "studentName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (_value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.studentName}</Typography.Text>
            <Typography.Text type="secondary">
              NIS {record.studentNis} • {record.className}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Mata pelajaran",
        dataIndex: "subjectName",
        key: "subject",
        sorter: true,
        sortOrder: sortState.field === "subjectName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (_value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{record.subjectName}</Typography.Text>
            <Typography.Text type="secondary">{record.teacherName}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Komponen",
        dataIndex: "componentName",
        key: "component",
        sorter: true,
        sortOrder: sortState.field === "componentName" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (_value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{record.componentName}</Typography.Text>
            <Typography.Text type="secondary">
              Bobot {record.componentWeight}% • KKM {record.kkm}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Nilai",
        dataIndex: "score",
        key: "score",
        align: "center",
        sorter: true,
        sortOrder: sortState.field === "score" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text
              strong
              style={{ color: toneColorMap[record.status.tone], fontSize: 18 }}
            >
              {value}
            </Typography.Text>
            <Typography.Text type="secondary">KKM {record.kkm}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Terakhir diperbarui",
        dataIndex: "lastUpdated",
        key: "lastUpdated",
        sorter: true,
        sortOrder: sortState.field === "lastUpdated" ? sortState.order : undefined,
        sortDirections: ["ascend", "descend"],
        render: (value: string) => <Typography.Text>{formatDate(value)}</Typography.Text>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (_value, record) => toneTag(record),
      },
      {
        title: "Aksi",
        dataIndex: "actions",
        key: "actions",
        align: "center",
        render: (_value, record) => (
          <Dropdown
            menu={{
              items: actionMenuItems,
              onClick: ({ key }) => handleRowAction(key as ActionKey, record),
            }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ],
    [actionMenuItems, handleRowAction, sortState.field, sortState.order, toneTag]
  );

  const handleTableChange: TableProps<GradeReportRow>["onChange"] = useCallback(
    (pager, _filters, sorter) => {
      setPagination((prev) => ({
        current: pager.current ?? prev.current,
        pageSize: pager.pageSize ?? prev.pageSize,
      }));
      const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      if (normalizedSorter && normalizedSorter.field) {
        if (normalizedSorter.order) {
          setSortState({
            field: normalizedSorter.field as keyof GradeReportRow,
            order: normalizedSorter.order as "ascend" | "descend",
          });
        } else {
          setSortState({ field: undefined, order: undefined });
        }
      }
    },
    []
  );

  const tablePagination = useMemo(
    () => ({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: totalRecords,
      showTotal: (total: number) => `${total} nilai`,
      showSizeChanger: true,
      pageSizeOptions: ["10", "12", "20", "50"],
    }),
    [pagination.current, pagination.pageSize, totalRecords]
  );

  const handleExport = useCallback((kind: "pdf" | "xlsx" | "summary") => {
    downloadCsv(
      `grades-${kind}.csv`,
      rows.map(
        ({
          id,
          studentName,
          studentNis,
          className,
          subjectName,
          componentName,
          score,
          status,
        }) => ({
          id,
          studentName,
          studentNis,
          className,
          subjectName,
          componentName,
          score,
          status: status?.code,
        })
      )
    );
  }, []);

  const enterpriseCardStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    boxShadow: "none",
    borderRadius: 6,
  };

  const renderMobileCards = useCallback(
    () =>
      rows.length === 0 ? (
        <Empty description="Belum ada nilai untuk filter ini" />
      ) : (
        <List
          dataSource={rows}
          renderItem={(record) => (
            <List.Item key={record.id}>
              <Card style={{ width: "100%", ...enterpriseCardStyle }}>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    <Typography.Text strong>{record.studentName}</Typography.Text>
                    <Typography.Text type="secondary">
                      {record.className} • NIS {record.studentNis}
                    </Typography.Text>
                  </Space>
                  <Divider style={{ margin: "12px 0" }} />
                  <Space direction="vertical" size={2}>
                    <Typography.Text>{record.subjectName}</Typography.Text>
                    <Typography.Text type="secondary">{record.teacherName}</Typography.Text>
                  </Space>
                  <Space direction="vertical" size={2}>
                    <Typography.Text>{record.componentName}</Typography.Text>
                    <Typography.Text type="secondary">
                      Bobot {record.componentWeight}% • KKM {record.kkm}
                    </Typography.Text>
                  </Space>
                  <Space align="center" justify="space-between">
                    <Typography.Text
                      strong
                      style={{ color: toneColorMap[record.status.tone], fontSize: 22 }}
                    >
                      {record.score}
                    </Typography.Text>
                    {toneTag(record)}
                  </Space>
                  <Typography.Text type="secondary">
                    Terakhir diperbarui {formatDate(record.lastUpdated)}
                  </Typography.Text>
                  <Space justify="end">
                    <Dropdown
                      menu={{
                        items: actionMenuItems,
                        onClick: ({ key }) => handleRowAction(key as ActionKey, record),
                      }}
                      trigger={["click"]}
                    >
                      <Button icon={<MoreOutlined />} />
                    </Dropdown>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ),
    [actionMenuItems, handleRowAction, rows, toneTag]
  );

  const renderTable = useMemo(() => {
    if (isMobile) {
      return renderMobileCards();
    }
    return (
      <Table<GradeReportRow>
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
      <Space
        direction="vertical"
        size="large"
        style={{ width: "100%", paddingInline: isMobile ? 0 : 8 }}
      >
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {context?.className ? `Nilai ${context.className}` : "Laporan Nilai Akademik"}
          </Typography.Title>
          <Typography.Text type="secondary">
            {context?.termLabel ?? "Tahun pelajaran aktif"}{" "}
            {context?.teacherName ? `• Guru: ${context.teacherName}` : ""}
          </Typography.Text>
        </Space>

        <Row gutter={[16, 16]}>
          {summaryCards.map((card) => (
            <Col xs={24} sm={12} md={12} lg={6} key={card.key}>
              <Card
                bordered
                style={{ ...enterpriseCardStyle, borderTop: `3px solid ${card.tone}` }}
                bodyStyle={{ minHeight: 112 }}
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space align="center">
                    <Typography.Text type="secondary">{card.title}</Typography.Text>
                    {card.icon}
                  </Space>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {card.value}
                  </Typography.Title>
                  {card.helper ? (
                    <Typography.Text type="secondary">{card.helper}</Typography.Text>
                  ) : null}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Card style={enterpriseCardStyle}>
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            size={isMobile ? 12 : 16}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space wrap>
              <Select
                allowClear
                placeholder="Tahun ajar"
                value={filtersState.termId}
                onChange={(value) => handleFilterChange("termId", value)}
                style={{ minWidth: 180 }}
                options={
                  filters?.terms.map((term) => ({
                    value: term.id,
                    label: `${term.label} • ${term.extras.year} / Semester ${term.extras.semester}`,
                  })) ?? []
                }
                suffixIcon={<FilterOutlined />}
              />
              <Select
                allowClear
                placeholder="Kelas"
                value={filtersState.classId}
                onChange={(value) => handleFilterChange("classId", value)}
                style={{ minWidth: 180 }}
                options={
                  filters?.classes.map((klass) => ({
                    value: klass.id,
                    label: `${klass.label} • ${klass.extras.track}`,
                  })) ?? []
                }
              />
              <Select
                allowClear
                placeholder="Mapel"
                value={filtersState.subjectId}
                onChange={(value) => handleFilterChange("subjectId", value)}
                style={{ minWidth: 200 }}
                showSearch
                optionFilterProp="label"
                options={
                  filters?.subjects.map((subject) => ({
                    value: subject.id,
                    label: subject.label,
                  })) ?? []
                }
              />
              <Select
                allowClear
                placeholder="Komponen"
                value={filtersState.componentId}
                onChange={(value) => handleFilterChange("componentId", value)}
                style={{ minWidth: 220 }}
                showSearch
                optionFilterProp="label"
                options={
                  filters?.components.map((component) => ({
                    value: component.id,
                    label: component.label,
                  })) ?? []
                }
              />
              <Select
                allowClear
                placeholder="Guru"
                value={filtersState.teacherId}
                onChange={(value) => handleFilterChange("teacherId", value)}
                style={{ minWidth: 200 }}
                showSearch
                optionFilterProp="label"
                options={
                  filters?.teachers.map((teacher) => ({
                    value: teacher.id,
                    label: teacher.label,
                  })) ?? []
                }
              />
              <Select
                value={filtersState.status}
                onChange={handleStatusChange}
                style={{ minWidth: 180 }}
                options={
                  filters?.statuses.map((status) => ({
                    value: status.value,
                    label: status.label,
                  })) ?? []
                }
              />
            </Space>
            <Space wrap align="center">
              <Space>
                <Select
                  allowClear
                  placeholder="Urutkan berdasar"
                  value={sortState.field}
                  onChange={handleSortFieldChange}
                  options={sortingOptions}
                  style={{ minWidth: 180 }}
                />
                <Tooltip
                  title={sortState.order === "descend" ? "Urutkan menurun" : "Urutkan menaik"}
                >
                  <Button
                    icon={
                      sortState.order === "descend" ? (
                        <SortDescendingOutlined />
                      ) : (
                        <SortAscendingOutlined />
                      )
                    }
                    onClick={handleSortOrderToggle}
                    disabled={!sortState.field}
                  />
                </Tooltip>
              </Space>
              <InputNumber
                placeholder="Nilai min"
                min={0}
                max={100}
                value={scoreMin}
                onChange={handleScoreMinChange}
              />
              <InputNumber
                placeholder="Nilai max"
                min={0}
                max={100}
                value={scoreMax}
                onChange={handleScoreMaxChange}
              />
              <Input.Search
                allowClear
                placeholder="Cari siswa / mapel"
                value={searchValue}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                suffix={<SearchOutlined />}
                style={{ width: isMobile ? "100%" : 220 }}
              />
            </Space>
          </Space>
          <Divider />
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
              Muat ulang
            </Button>
            <Button onClick={handleResetFilters}>Reset filter</Button>
          </Space>
        </Card>

        <Segmented
          block={isMobile}
          options={tabOptions}
          value={view}
          onChange={(value) => setView(value as TabKey)}
        />

        {view === "distribution" ? (
          <Card title="Distribusi nilai" style={enterpriseCardStyle}>
            {distribution.length === 0 ? (
              <Empty description="Belum ada data distribusi" />
            ) : (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {distribution.map((bucket) => {
                  const percent =
                    totalRecords > 0 ? Math.round((bucket.count / totalRecords) * 100) : 0;
                  return (
                    <Space
                      key={bucket.bucket}
                      style={{ width: "100%", alignItems: "center" }}
                      size="large"
                    >
                      <Typography.Text style={{ minWidth: 80 }}>{bucket.bucket}</Typography.Text>
                      <Progress
                        percent={percent}
                        strokeColor="#2563eb"
                        style={{ flex: 1 }}
                        status="active"
                      />
                      <Typography.Text type="secondary">{bucket.count} siswa</Typography.Text>
                    </Space>
                  );
                })}
              </Space>
            )}
          </Card>
        ) : view === "export" ? (
          <Card title="Cetak dan ekspor laporan" style={enterpriseCardStyle}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Typography.Paragraph>
                Ekspor laporan nilai berbasis filter aktif untuk dibagikan ke TU atau kepala
                sekolah. Integrasi dengan backend akan menambahkan penomoran dan metadata otomatis.
              </Typography.Paragraph>
              <Space wrap>
                <Button
                  icon={<FilePdfOutlined />}
                  type="primary"
                  onClick={() => handleExport("pdf")}
                >
                  Cetak PDF laporan kelas
                </Button>
                <Button icon={<FileExcelOutlined />} onClick={() => handleExport("xlsx")}>
                  Ekspor Excel data mentah
                </Button>
                <Button icon={<BarChartOutlined />} onClick={() => handleExport("summary")}>
                  Rekap ringkas (KKM & remedial)
                </Button>
              </Space>
            </Space>
          </Card>
        ) : (
          <Card title="Daftar nilai" style={enterpriseCardStyle}>
            {rows.length === 0 ? (
              <Empty description="Belum ada nilai untuk filter ini" />
            ) : (
              renderTable
            )}
          </Card>
        )}
      </Space>
    </Spin>
  );
};
