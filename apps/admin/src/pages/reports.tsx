import { useList } from "../hooks/use-refine-list";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Progress, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import { useAppNotification } from "../hooks/use-app-notification";
import { httpClient } from "../providers/dataProvider";
import { ResourceActionGuard } from "../components/resource-action-guard";

const REPORT_TYPE_OPTIONS = [
  { label: "Kehadiran", value: "attendance" },
  { label: "Nilai", value: "grades" },
  { label: "Perilaku", value: "behavior" },
  { label: "Rangkuman", value: "summary" },
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  attendance: "Kehadiran",
  grades: "Nilai",
  behavior: "Perilaku",
  summary: "Rangkuman",
};

const FORMAT_OPTIONS = [
  { label: "CSV", value: "csv" },
  { label: "PDF", value: "pdf" },
];

const TEMPLATE_OPTIONS = [
  { label: "Standar", value: "simple" },
  { label: "Detail", value: "detailed" },
  { label: "Landscape", value: "landscape" },
];

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "default",
  PROCESSING: "processing",
  FINISHED: "success",
  FAILED: "error",
};

// Backend wraps responses in { data: ... }; MSW returns the resource directly.
const unwrap = (res: any) => {
  const body = res?.data;
  return body && typeof body === "object" && "data" in body ? body.data : body;
};

type ReportJob = {
  id: string;
  type: string;
  termId: string;
  classId?: string | null;
  format: string;
  status: string;
  progress: number;
  resultUrl?: string | null;
  error?: string | null;
  createdAt: string;
};

type GenerateFormValues = {
  type: string;
  termId: string;
  classId?: string;
  format: string;
  template?: string;
};

export const ReportsPage: React.FC = () => {
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [generating, setGenerating] = useState(false);
  const [form] = Form.useForm<GenerateFormValues>();
  const { open: notify } = useAppNotification();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const migratedTermsQuery = useList({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 50 },
  });

  const termsQuery = {
    ...migratedTermsQuery.result,
    ...migratedTermsQuery.query,
    ...migratedTermsQuery,
  };

  const migratedClassesQuery = useList({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 100 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const terms = (termsQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];

  const pollJob = useCallback(async (id: string) => {
    try {
      const res = await httpClient.get(`/reports/status/${id}`);
      const payload = unwrap(res) as Partial<ReportJob>;
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? {
                ...job,
                status: payload.status ?? job.status,
                progress: payload.progress ?? job.progress,
                resultUrl: payload.resultUrl ?? job.resultUrl,
                error: payload.error ?? job.error,
              }
            : job
        )
      );
    } catch {
      // ignore transient polling errors
    }
  }, []);

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "QUEUED" || j.status === "PROCESSING");
    if (hasActive && !timerRef.current) {
      timerRef.current = setInterval(() => {
        jobs.forEach((job) => {
          if (job.status === "QUEUED" || job.status === "PROCESSING") {
            void pollJob(job.id);
          }
        });
      }, 2000);
    }
    if (!hasActive && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobs, pollJob]);

  const handleGenerate = async (values: GenerateFormValues) => {
    setGenerating(true);
    try {
      const res = await httpClient.post("/reports/generate", {
        type: values.type,
        termId: values.termId,
        classId: values.classId ?? null,
        format: values.format,
        template: values.template ?? null,
      });
      const payload = unwrap(res) as Partial<ReportJob>;
      const job: ReportJob = {
        id: payload.id ?? `job_${Date.now()}`,
        type: values.type,
        termId: values.termId,
        classId: values.classId ?? null,
        format: values.format,
        status: payload.status ?? "QUEUED",
        progress: payload.progress ?? 0,
        resultUrl: null,
        error: null,
        createdAt: new Date().toISOString(),
      };
      setJobs((prev) => [job, ...prev]);
      notify?.({ type: "success", message: "Laporan diantrekan", description: `Job ${job.id}` });
      void pollJob(job.id);
    } catch (error) {
      notify?.({ type: "error", message: "Gagal membuat laporan", description: String(error) });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (job: ReportJob) => {
    if (job.resultUrl) {
      window.open(job.resultUrl, "_blank");
    } else {
      notify?.({ type: "error", message: "Hasil belum siap" });
    }
  };

  const columns: ColumnsType<ReportJob> = [
    { title: "Job ID", dataIndex: "id", key: "id", ellipsis: true, width: 220 },
    {
      title: "Jenis",
      key: "type",
      render: (_, record) => REPORT_TYPE_LABELS[record.type] ?? record.type,
    },
    { title: "Format", dataIndex: "format", key: "format", width: 90 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => <Tag color={STATUS_COLORS[status] ?? "default"}>{status}</Tag>,
    },
    {
      title: "Progres",
      key: "progress",
      width: 160,
      render: (_, record) => (
        <Progress
          percent={record.progress}
          size="small"
          status={
            record.status === "FAILED"
              ? "exception"
              : record.status === "FINISHED"
                ? "success"
                : "active"
          }
        />
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 140,
      render: (_, record) =>
        record.status === "FINISHED" && record.resultUrl ? (
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
            Unduh
          </Button>
        ) : record.error ? (
          <Typography.Text type="danger">{record.error}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
  ];

  return (
    <ResourceActionGuard action="list" resourceName="reports">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Laporan Async & Ekspor
          </Typography.Title>

          <Card title="Buat Laporan">
            <Form
              form={form}
              layout="inline"
              onFinish={handleGenerate}
              initialValues={{ type: "summary", format: "csv" }}
            >
              <Form.Item label="Jenis" name="type" rules={[{ required: true }]}>
                <Select options={REPORT_TYPE_OPTIONS} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item
                label="Term"
                name="termId"
                rules={[{ required: true, message: "Pilih term" }]}
              >
                <Select
                  placeholder="Pilih term"
                  style={{ width: 200 }}
                  options={terms.map((t) => ({ value: t.id, label: t.name }))}
                />
              </Form.Item>
              <Form.Item label="Kelas (opsional)" name="classId">
                <Select
                  allowClear
                  placeholder="Pilih kelas"
                  style={{ width: 200 }}
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
              <Form.Item label="Format" name="format" rules={[{ required: true }]}>
                <Select options={FORMAT_OPTIONS} style={{ width: 110 }} />
              </Form.Item>
              <Form.Item label="Template (PDF)" name="template">
                <Select
                  allowClear
                  placeholder="Pilih template"
                  style={{ width: 140 }}
                  options={TEMPLATE_OPTIONS}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={generating}>
                  Buat Laporan
                </Button>
              </Form.Item>
            </Form>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
              Laporan diproses secara asynchronous. Pantau progres pada tabel di bawah, lalu unduh
              hasil saat status FINISHED.
            </Typography.Paragraph>
          </Card>

          <Card title="Status Laporan">
            {jobs.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Belum ada laporan"
                description="Buat laporan baru melalui form di atas."
              />
            ) : (
              <Table rowKey="id" columns={columns} dataSource={jobs} pagination={false} />
            )}
          </Card>
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
