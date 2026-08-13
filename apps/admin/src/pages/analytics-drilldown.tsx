import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useList } from "@refinedev/core";
import { useParams } from "react-router-dom";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { resolveActiveTerm } from "../utils/terms";
import {
  type AnalyticsClass,
  type AnalyticsDetail,
  type AnalyticsLeaderboard,
  type AnalyticsMetric,
  type AnalyticsStudent,
  type AnalyticsSubject,
  useAnalyticsDrilldown,
} from "../hooks/use-analytics-drilldown";

type TermRecord = {
  id: string;
  name: string;
  active?: boolean;
  isActive?: boolean;
};

type ScopeRecord = {
  id: string;
  name?: string;
  fullName?: string;
  code?: string;
  nis?: string;
};

type ViewMode = "class" | "student" | "subject";

const modeLabels: Record<ViewMode, string> = {
  class: "Kelas",
  student: "Siswa",
  subject: "Mata pelajaran",
};

const metricLabels: Record<AnalyticsMetric, string> = {
  gpa: "GPA",
  attendance: "Kehadiran",
  behavior: "Perilaku",
};

const numberValue = (value: number | undefined, suffix = "") =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "–";

const scopeLabel = (record: ScopeRecord) =>
  record.name || record.fullName || record.code || record.nis || record.id;

const classColumns: ColumnsType<AnalyticsClass["students"][number]> = [
  { title: "Peringkat", dataIndex: "rank", key: "rank", width: 100 },
  { title: "Nama", dataIndex: "studentName", key: "studentName" },
  { title: "NIS", dataIndex: "nis", key: "nis" },
  { title: "GPA", dataIndex: "gpa", key: "gpa", render: (value: number) => numberValue(value) },
  {
    title: "Kehadiran",
    dataIndex: "attendancePercentage",
    key: "attendancePercentage",
    render: (value: number) => numberValue(value, "%"),
  },
];

const classSubjectColumns: ColumnsType<AnalyticsClass["subjectPerformance"][number]> = [
  { title: "Mata pelajaran", dataIndex: "subjectName", key: "subjectName" },
  { title: "Jumlah siswa", dataIndex: "totalStudents", key: "totalStudents" },
  {
    title: "Rata-rata",
    dataIndex: "averageGrade",
    key: "averageGrade",
    render: (value: number) => numberValue(value),
  },
  {
    title: "Kelulusan",
    dataIndex: "passRate",
    key: "passRate",
    render: (value: number) => numberValue(value, "%"),
  },
];

const studentSubjectColumns: ColumnsType<AnalyticsStudent["subjectBreakdown"][number]> = [
  { title: "Kode", dataIndex: "subjectCode", key: "subjectCode" },
  { title: "Mata pelajaran", dataIndex: "subjectName", key: "subjectName" },
  {
    title: "Nilai akhir",
    dataIndex: "finalGrade",
    key: "finalGrade",
    render: (value: number) => numberValue(value),
  },
];

const subjectClassColumns: ColumnsType<AnalyticsSubject["byClass"][number]> = [
  { title: "Kelas", dataIndex: "className", key: "className" },
  { title: "Jumlah siswa", dataIndex: "totalStudents", key: "totalStudents" },
  {
    title: "Rata-rata",
    dataIndex: "averageGrade",
    key: "averageGrade",
    render: (value: number) => numberValue(value),
  },
  {
    title: "Kelulusan",
    dataIndex: "passRate",
    key: "passRate",
    render: (value: number) => numberValue(value, "%"),
  },
];

const leaderboardColumns: ColumnsType<AnalyticsLeaderboard["leaderboard"][number]> = [
  { title: "Peringkat", dataIndex: "rank", key: "rank", width: 100 },
  { title: "Nama", dataIndex: "studentName", key: "studentName" },
  { title: "NIS", dataIndex: "nis", key: "nis" },
  { title: "Kelas", dataIndex: "className", key: "className" },
  {
    title: "Skor",
    dataIndex: "score",
    key: "score",
    render: (value: number) => numberValue(value),
  },
];

const subjectPerformerColumns: ColumnsType<AnalyticsSubject["topPerformers"][number]> = [
  { title: "Peringkat", key: "rank", render: (_value, _record, index) => index + 1 },
  { title: "Nama", dataIndex: "studentName", key: "studentName" },
  { title: "Kelas", dataIndex: "className", key: "className" },
  {
    title: "Nilai",
    dataIndex: "grade",
    key: "grade",
    render: (value: number) => numberValue(value),
  },
];

const isClassDetail = (
  mode: ViewMode,
  value: AnalyticsDetail | undefined
): value is AnalyticsClass => {
  return mode === "class" && value !== undefined && "students" in value;
};

const isStudentDetail = (
  mode: ViewMode,
  value: AnalyticsDetail | undefined
): value is AnalyticsStudent => {
  return mode === "student" && value !== undefined && "performance" in value;
};

const isSubjectDetail = (
  mode: ViewMode,
  value: AnalyticsDetail | undefined
): value is AnalyticsSubject => {
  return mode === "subject" && value !== undefined && "overall" in value;
};

export const AnalyticsDrilldownPage: React.FC = () => {
  const params = useParams<{ resource?: string; id?: string }>();
  const routeMode =
    params.resource === "class" || params.resource === "student" || params.resource === "subject"
      ? params.resource
      : undefined;
  const [mode, setMode] = useState<ViewMode>(routeMode ?? "class");
  const [termId, setTermId] = useState<string>();
  const [resourceId, setResourceId] = useState<string | undefined>(params.id);
  const [subjectClassId, setSubjectClassId] = useState<string>();
  const [metric, setMetric] = useState<AnalyticsMetric>("gpa");

  const termsQuery = useList<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 100 },
  });
  const classesQuery = useList<ScopeRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 100 },
  });
  const studentsQuery = useList<ScopeRecord>({
    resource: "students",
    pagination: { current: 1, pageSize: 100 },
  });
  const subjectsQuery = useList<ScopeRecord>({
    resource: "subjects",
    pagination: { current: 1, pageSize: 100 },
  });

  const terms = termsQuery.data?.data ?? [];
  const scopes = useMemo(() => {
    if (mode === "class") return classesQuery.data?.data ?? [];
    if (mode === "student") return studentsQuery.data?.data ?? [];
    return subjectsQuery.data?.data ?? [];
  }, [classesQuery.data?.data, mode, studentsQuery.data?.data, subjectsQuery.data?.data]);

  useEffect(() => {
    if (!termId) setTermId(resolveActiveTerm(terms)?.id);
  }, [termId, terms]);

  useEffect(() => {
    if (!resourceId || !scopes.some((scope) => scope.id === resourceId)) {
      setResourceId(scopes[0]?.id);
    }
  }, [resourceId, scopes]);

  const leaderboardClassId =
    mode === "class" ? resourceId : mode === "subject" ? subjectClassId : undefined;
  const analytics = useAnalyticsDrilldown({
    resource: mode,
    resourceId,
    termId,
    classId: leaderboardClassId,
    limit: 10,
  });
  const detail = analytics.detail.data;
  const leaderboard = analytics.leaderboards[metric].data;

  const subjectClasses = classesQuery.data?.data ?? [];
  const selectedTerm = terms.find((term) => term.id === termId);

  useEffect(() => {
    if (routeMode) {
      setMode(routeMode);
      setResourceId(params.id);
    }
  }, [params.id, routeMode]);

  return (
    <ResourceActionGuard action="list" resourceName="analytics">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Analitik detail
          </Typography.Title>
          <Typography.Text type="secondary">
            Telusuri performa kelas, siswa, mata pelajaran, dan peringkat berdasarkan term.
          </Typography.Text>
        </div>

        <Card>
          <Space wrap>
            <Segmented
              options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
              value={mode}
              onChange={(value) => {
                setMode(value as ViewMode);
                setResourceId(undefined);
              }}
            />
            <Select
              showSearch
              optionFilterProp="label"
              value={termId}
              onChange={setTermId}
              options={terms.map((term) => ({ value: term.id, label: term.name }))}
              placeholder="Pilih term"
              style={{ minWidth: 220 }}
              loading={termsQuery.isLoading}
            />
            <Select
              showSearch
              optionFilterProp="label"
              value={resourceId}
              onChange={setResourceId}
              options={scopes.map((scope) => ({ value: scope.id, label: scopeLabel(scope) }))}
              placeholder={`Pilih ${modeLabels[mode].toLowerCase()}`}
              style={{ minWidth: 240 }}
              loading={classesQuery.isLoading || studentsQuery.isLoading || subjectsQuery.isLoading}
            />
            {mode === "subject" ? (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                value={subjectClassId}
                onChange={setSubjectClassId}
                options={subjectClasses.map((scope) => ({
                  value: scope.id,
                  label: scopeLabel(scope),
                }))}
                placeholder="Filter kelas (opsional)"
                style={{ minWidth: 220 }}
              />
            ) : null}
          </Space>
          {selectedTerm ? (
            <Tag color="blue" style={{ marginTop: 12 }}>
              {selectedTerm.name}
            </Tag>
          ) : null}
        </Card>

        {!termId || !resourceId ? (
          <Alert type="info" showIcon message="Pilih term dan target untuk melihat analitik." />
        ) : analytics.detail.isLoading ? (
          <Card>
            <Spin spinning />
          </Card>
        ) : analytics.detail.isError ? (
          <Alert
            type="error"
            showIcon
            message="Analitik tidak dapat dimuat."
            description={analytics.detail.error.message}
          />
        ) : isClassDetail(mode, detail) ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Total siswa" value={detail.totalStudents} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Rata-rata nilai" value={detail.averageGrade} precision={2} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Kehadiran"
                    value={detail.averageAttendance}
                    precision={2}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>
            <Card title={`Siswa — ${detail.className}`}>
              <Table
                rowKey="studentId"
                dataSource={detail.students}
                columns={classColumns}
                pagination={{ pageSize: 10 }}
              />
            </Card>
            <Card title="Performa mata pelajaran">
              <Table
                rowKey="subjectId"
                dataSource={detail.subjectPerformance}
                columns={classSubjectColumns}
                pagination={false}
              />
            </Card>
          </>
        ) : isStudentDetail(mode, detail) ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="GPA" value={detail.performance.gpa} precision={2} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Peringkat"
                    value={detail.performance.rank}
                    suffix={`/ ${detail.performance.totalRank}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Kehadiran"
                    value={detail.attendance.percentage}
                    precision={2}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>
            <Card title={`${detail.studentName} — ${detail.className}`}>
              <Table
                rowKey="subjectId"
                dataSource={detail.subjectBreakdown}
                columns={studentSubjectColumns}
                pagination={false}
              />
            </Card>
          </>
        ) : isSubjectDetail(mode, detail) ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic title="Total siswa" value={detail.overall.totalStudents} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Rata-rata nilai"
                    value={detail.overall.averageGrade}
                    precision={2}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Kelulusan"
                    value={detail.overall.passRate}
                    precision={2}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>
            <Card title={`Per kelas — ${detail.subjectName}`}>
              <Table
                rowKey="classId"
                dataSource={detail.byClass}
                columns={subjectClassColumns}
                pagination={false}
              />
            </Card>
            <Card title="Siswa berprestasi">
              <Table
                rowKey="studentId"
                dataSource={detail.topPerformers}
                columns={subjectPerformerColumns}
                pagination={false}
              />
            </Card>
          </>
        ) : (
          <Empty description="Data analitik belum tersedia untuk pilihan ini." />
        )}

        <Card
          title="Papan peringkat"
          extra={
            <Segmented
              options={Object.entries(metricLabels).map(([value, label]) => ({ value, label }))}
              value={metric}
              onChange={(value) => setMetric(value as AnalyticsMetric)}
            />
          }
        >
          {analytics.leaderboards[metric].isLoading ? (
            <Spin />
          ) : analytics.leaderboards[metric].isError ? (
            <Alert type="warning" message="Papan peringkat tidak dapat dimuat." />
          ) : leaderboard?.leaderboard?.length ? (
            <Table
              rowKey="studentId"
              dataSource={leaderboard.leaderboard}
              columns={leaderboardColumns}
              pagination={false}
            />
          ) : (
            <Empty description="Belum ada data peringkat." />
          )}
        </Card>
      </Space>
    </ResourceActionGuard>
  );
};
