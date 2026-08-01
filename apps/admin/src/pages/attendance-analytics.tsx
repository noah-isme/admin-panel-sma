import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  List,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAttendanceAnalytics, type AttendanceStatus } from "../hooks/use-attendance-analytics";

const { RangePicker } = DatePicker;

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  boxShadow: "none",
  border: "1px solid #e5e7eb",
};

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; description: string }> =
  {
    H: {
      label: "Hadir",
      color: "success",
      description: "Kehadiran penuh pada hari tersebut.",
    },
    I: {
      label: "Izin",
      color: "warning",
      description: "Izin resmi dengan keterangan tertulis.",
    },
    S: {
      label: "Sakit",
      color: "processing",
      description: "Sakit disertai surat atau catatan orang tua.",
    },
    A: {
      label: "Alfa",
      color: "error",
      description: "Tidak hadir tanpa keterangan resmi.",
    },
  };

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

type ChartPoint = { label: string; value: number };

const SimpleBarChart: React.FC<{ data: ChartPoint[]; color?: string }> = ({
  data,
  color = "#4f46e5",
}) => {
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        height: 200,
        padding: "16px 8px 8px 8px",
      }}
    >
      {data.map((point) => {
        const heightRatio = Math.max(point.value / max, 0);
        const barHeight = `${Math.max(heightRatio * 100, 4)}%`;
        return (
          <div
            key={point.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: "45%",
                minWidth: 20,
                borderRadius: "2px 2px 0 0",
                background: color,
                transition: "height 0.2s ease-in-out",
                height: barHeight,
              }}
            />
            <Typography.Text strong style={{ fontSize: 12 }}>
              {point.value}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {point.label}
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
};

const SimpleLineChart: React.FC<{ data: ChartPoint[]; color?: string }> = ({
  data,
  color = "#4f46e5",
}) => {
  const max = Math.max(...data.map((point) => point.value), 100);
  const min = 0;
  const range = Math.max(max - min, 1);
  const points = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((point.value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ width: "100%", height: 200, padding: "8px 4px 0 4px" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "155px" }}
      >
        <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeDasharray="3 3" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeDasharray="3 3" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeDasharray="3 3" />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((point, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - ((point.value - min) / range) * 100;
          return <circle key={point.label} cx={x} cy={y} r={2} fill={color} />;
        })}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          padding: "4px 0 0 0",
        }}
      >
        {data.map((point) => (
          <Typography.Text key={point.label} type="secondary" style={{ fontSize: 11 }}>
            {point.label}
          </Typography.Text>
        ))}
      </div>
    </div>
  );
};

export const AttendanceAnalyticsPage: React.FC = () => {
  const [termId, setTermId] = useState<string | undefined>();
  const [classId, setClassId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus[]>(["H", "I", "S", "A"]);
  const [rangeValue, setRangeValue] = useState<[Dayjs, Dayjs] | null>(null);

  const analytics = useAttendanceAnalytics({
    termId,
    classId,
    range: rangeValue
      ? {
          start: rangeValue[0].format(DEFAULT_DATE_FORMAT),
          end: rangeValue[1].format(DEFAULT_DATE_FORMAT),
        }
      : undefined,
    statuses: statusFilter,
  });

  useEffect(() => {
    if (!termId && analytics.selectedTerm?.id) {
      setTermId(analytics.selectedTerm.id);
    }
  }, [analytics.selectedTerm?.id, termId]);

  useEffect(() => {
    if (!classId && analytics.selectedClass?.id) {
      setClassId(analytics.selectedClass.id);
    }
  }, [analytics.selectedClass?.id, classId]);

  useEffect(() => {
    if (!rangeValue && analytics.dateRange) {
      setRangeValue([
        dayjs(analytics.dateRange.start, DEFAULT_DATE_FORMAT),
        dayjs(analytics.dateRange.end, DEFAULT_DATE_FORMAT),
      ]);
    }
  }, [analytics.dateRange, rangeValue]);

  const tableData = useMemo(() => {
    return analytics.studentSummaries.map((summary) => ({
      key: summary.studentId,
      ...summary,
    }));
  }, [analytics.studentSummaries]);

  const columns: ColumnsType<(typeof tableData)[number]> = useMemo(
    () => [
      {
        title: "Nama Siswa",
        dataIndex: "studentName",
        width: 240,
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12 }}
            >{`NIS: ${record.nis}`}</Typography.Text>
            {record.behaviorNotes ? (
              <Tag
                color="warning"
                style={{ fontSize: 11, borderRadius: 2 }}
              >{`${record.behaviorNotes} catatan`}</Tag>
            ) : null}
          </Space>
        ),
      },
      ...(["H", "I", "S", "A"] as AttendanceStatus[]).map((status) => ({
        title: STATUS_META[status].label,
        dataIndex: ["counts", status],
        align: "center" as const,
        width: 80,
        render: (value: number) => (
          <Tag color={STATUS_META[status].color} style={{ margin: 0, borderRadius: 2 }}>
            {value}
          </Tag>
        ),
      })),
      {
        title: "Persentase Hadir",
        dataIndex: "percentage",
        width: 160,
        render: (value: number) => (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Progress
              percent={Number(value.toFixed(1))}
              size="small"
              strokeColor="#10b981"
              showInfo={false}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatPercentage(value)}
            </Typography.Text>
          </Space>
        ),
      },
    ],
    []
  );

  const alphaChartData = useMemo<ChartPoint[]>(() => {
    if (analytics.weeklyAlpha.length === 0) {
      return [];
    }
    return analytics.weeklyAlpha.map((point) => ({
      label: dayjs(point.week, DEFAULT_DATE_FORMAT).format("DD MMM"),
      value: point.alpha,
    }));
  }, [analytics.weeklyAlpha]);

  const attendanceChartData = useMemo<ChartPoint[]>(() => {
    if (analytics.weeklyAttendance.length === 0) {
      return [];
    }
    return analytics.weeklyAttendance.map((point) => ({
      label: dayjs(point.week, DEFAULT_DATE_FORMAT).format("DD MMM"),
      value: Number(point.attendance.toFixed(2)),
    }));
  }, [analytics.weeklyAttendance]);

  const handleExportCsv = useCallback(() => {
    if (analytics.studentSummaries.length === 0) {
      return;
    }

    const headers = ["Nama Siswa", "NIS", "H", "I", "S", "A", "Persentase Hadir"];
    const rows = analytics.studentSummaries.map((summary) => [
      JSON.stringify(summary.studentName),
      JSON.stringify(summary.nis),
      summary.counts.H,
      summary.counts.I,
      summary.counts.S,
      summary.counts.A,
      `${summary.percentage.toFixed(2)}%`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `rekap-kehadiran-${analytics.selectedClass?.name ?? "kelas"}-${analytics.dateRange.start}-${analytics.dateRange.end}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    analytics.dateRange.end,
    analytics.dateRange.start,
    analytics.selectedClass?.name,
    analytics.studentSummaries,
  ]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space direction="vertical" size={2} style={{ width: "100%" }}>
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Rekap Kehadiran {analytics.selectedTerm ? `- ${analytics.selectedTerm.name}` : ""}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Analitik kehadiran terintegrasi untuk monitoring wali kelas, TU, dan kepala sekolah.
        </Typography.Text>
      </Space>

      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Tahun Ajar
            </Typography.Text>
            <Select
              placeholder="Pilih tahun ajar"
              style={{ width: "100%", marginTop: 4 }}
              value={termId}
              onChange={(value) => setTermId(value)}
              options={analytics.terms.map((term) => ({
                label: term.name,
                value: term.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Kelas
            </Typography.Text>
            <Select
              placeholder="Pilih kelas"
              style={{ width: "100%", marginTop: 4 }}
              value={classId}
              onChange={(value) => setClassId(value)}
              options={analytics.classes.map((klass) => ({
                label: klass.name,
                value: klass.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Rentang tanggal
            </Typography.Text>
            <RangePicker
              style={{ width: "100%", marginTop: 4 }}
              value={rangeValue}
              onChange={(value) => setRangeValue(value as [Dayjs, Dayjs] | null)}
              format="DD MMM YYYY"
              allowEmpty={[false, false]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Status kehadiran
            </Typography.Text>
            <Select
              mode="multiple"
              style={{ width: "100%", marginTop: 4 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as AttendanceStatus[])}
              options={STATUS_OPTIONS}
              maxTagCount="responsive"
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Space align="baseline" style={{ justifyContent: "space-between", width: "100%" }}>
                <div>
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    Statistik Semester
                  </Typography.Text>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Rata-rata kehadiran {analytics.selectedClass?.name ?? "kelas"}:{" "}
                      <Typography.Text strong>
                        {formatPercentage(analytics.stats.averageAttendance)}
                      </Typography.Text>
                    </Typography.Text>
                  </div>
                </div>
                <Space>
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleExportCsv}>
                    Export CSV
                  </Button>
                  <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>
                    Cetak PDF
                  </Button>
                </Space>
              </Space>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card
                    size="small"
                    bordered
                    style={{ background: "#fafafa", borderColor: "#e5e7eb", borderRadius: 4 }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Total Sesi
                    </Typography.Text>
                    <Typography.Title level={4} style={{ margin: "2px 0 0 0", fontWeight: 700 }}>
                      {analytics.stats.totalSessions}
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Tercatat dalam rentang ini
                    </Typography.Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    bordered
                    style={{ background: "#fafafa", borderColor: "#e5e7eb", borderRadius: 4 }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Total Alfa
                    </Typography.Text>
                    <Typography.Title level={4} style={{ margin: "2px 0 0 0", fontWeight: 700 }}>
                      {analytics.stats.alphaTotal}
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {analytics.stats.latestAbsenceCount > 0 && analytics.stats.latestAbsenceDate
                        ? `Terbaru: ${analytics.stats.latestAbsenceCount} siswa (${dayjs(
                            analytics.stats.latestAbsenceDate,
                            DEFAULT_DATE_FORMAT
                          ).format("DD MMM")})`
                        : "Tidak ada alfa terbaru"}
                    </Typography.Text>
                  </Card>
                </Col>
              </Row>

              <Card
                size="small"
                style={{ borderRadius: 4, borderColor: "#e5e7eb" }}
                title={
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    Top 3 Siswa Kehadiran Tertinggi
                  </Typography.Text>
                }
              >
                {analytics.stats.topStudents.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Belum ada data kehadiran"
                  />
                ) : (
                  <List
                    size="small"
                    dataSource={analytics.stats.topStudents}
                    renderItem={(item, index) => (
                      <List.Item style={{ padding: "6px 0" }}>
                        <List.Item.Meta
                          title={
                            <Space size={8}>
                              <Tag style={{ margin: 0, borderRadius: 2 }}>#{index + 1}</Tag>
                              <Typography.Text strong style={{ fontSize: 13 }}>
                                {item.studentName}
                              </Typography.Text>
                            </Space>
                          }
                          description={
                            <Space size={8} wrap style={{ marginTop: 2 }}>
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                NIS {item.nis}
                              </Typography.Text>
                              <Tag
                                color="success"
                                style={{ margin: 0, borderRadius: 2, fontSize: 11 }}
                              >
                                Hadir {item.counts.H} kali ({formatPercentage(item.percentage)})
                              </Tag>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            bodyStyle={{ padding: 16 }}
            title={
              <Typography.Text strong style={{ fontSize: 15 }}>
                Grafik Tren Kehadiran
              </Typography.Text>
            }
          >
            {attendanceChartData.length > 0 ? (
              <SimpleLineChart data={attendanceChartData} />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada data tren kehadiran"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            bodyStyle={{ padding: 16 }}
            title={
              <Typography.Text strong style={{ fontSize: 15 }}>
                Diagram Alfa Mingguan
              </Typography.Text>
            }
          >
            {alphaChartData.length > 0 ? (
              <SimpleBarChart data={alphaChartData} color="#ef4444" />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada data alfa mingguan"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            bodyStyle={{ padding: 16 }}
            title={
              <Typography.Text strong style={{ fontSize: 15 }}>
                Catatan Status Kehadiran
              </Typography.Text>
            }
          >
            <List
              size="small"
              dataSource={
                Object.entries(STATUS_META) as Array<[AttendanceStatus, typeof STATUS_META.H]>
              }
              renderItem={([value, meta]) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <List.Item.Meta
                    avatar={
                      <Tag
                        color={meta.color}
                        style={{ marginRight: 8, borderRadius: 2, fontWeight: 600 }}
                      >
                        {value}
                      </Tag>
                    }
                    title={
                      <Space size={8}>
                        <Typography.Text strong style={{ fontSize: 13 }}>
                          {meta.label}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          (
                          {analytics.studentSummaries.reduce(
                            (acc, summary) => acc + summary.counts[value],
                            0
                          )}{" "}
                          kali)
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {meta.description}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space align="baseline" style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Text strong style={{ fontSize: 15 }}>
              Tabel Rekap Kehadiran Siswa
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {`Data ${analytics.dateRange.start} s/d ${analytics.dateRange.end}`}
            </Typography.Text>
          </Space>

          <Table
            size="small"
            dataSource={tableData}
            columns={columns}
            loading={analytics.isFetching && tableData.length === 0}
            pagination={{ pageSize: 10, size: "small" }}
            locale={{
              emptyText: analytics.isLoading ? "Memuat data..." : "Belum ada data kehadiran",
            }}
            scroll={{ x: 900 }}
          />
        </Space>
      </Card>
    </Space>
  );
};
