import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  type UploadProps,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDelete, useList } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { httpClient } from "../providers/dataProvider";
import { ResourceActionGuard } from "../components/resource-action-guard";

const SCOPE_OPTIONS = [
  { label: "Global", value: "GLOBAL" },
  { label: "Term", value: "TERM" },
  { label: "Kelas", value: "CLASS" },
  { label: "Siswa", value: "STUDENT" },
];

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Global",
  TERM: "Term",
  CLASS: "Kelas",
  STUDENT: "Siswa",
};

const SCOPE_COLORS: Record<string, string> = {
  GLOBAL: "blue",
  TERM: "cyan",
  CLASS: "purple",
  STUDENT: "magenta",
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-";

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

// Backend wraps responses in { data: ... }; MSW returns the resource directly.
const unwrap = (res: any) => {
  const body = res?.data;
  return body && typeof body === "object" && "data" in body ? body.data : body;
};

type UploadFormValues = {
  title: string;
  category: string;
  scope: string;
  refTermId?: string;
  refClassId?: string;
  refStudentId?: string;
};

export const ArchivesPage: React.FC = () => {
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadProps["fileList"]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadForm] = Form.useForm<UploadFormValues>();
  const { open: notify } = useAppNotification();
  const { mutateAsync: deleteArchive } = useDelete();

  const termsQuery = useList({ resource: "terms", pagination: { current: 1, pageSize: 50 } });
  const classesQuery = useList({ resource: "classes", pagination: { current: 1, pageSize: 100 } });
  const archivesQuery = useList({
    resource: "archives",
    pagination: { current: 1, pageSize: 200 },
  });

  const terms = (termsQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];

  const archives = useMemo(() => {
    const data = (archivesQuery.data?.data as Record<string, any>[]) ?? [];
    if (scopeFilter === "ALL") return data;
    return data.filter((item) => (item.scope ?? "GLOBAL") === scopeFilter);
  }, [archivesQuery.data?.data, scopeFilter]);

  const handleDownload = async (item: Record<string, any>) => {
    try {
      const res = await httpClient.get(`/archives/${item.id}`);
      const payload = unwrap(res) as Record<string, any>;
      const url = payload?.downloadUrl ?? item.downloadUrl;
      if (!url) {
        notify?.({ type: "error", message: "URL unduhan tidak tersedia" });
        return;
      }
      window.open(url, "_blank");
    } catch (error) {
      notify?.({ type: "error", message: "Gagal mengambil unduhan", description: String(error) });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArchive({ resource: "archives", id });
      notify?.({ type: "success", message: "Arsip dihapus" });
      await archivesQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal menghapus arsip", description: String(error) });
    }
  };

  const handleUpload = async (values: UploadFormValues) => {
    if (!fileList || fileList.length === 0) {
      notify?.({ type: "error", message: "File wajib diunggah" });
      return;
    }
    const file = fileList[0]?.originFileObj as File | undefined;
    if (!file) {
      notify?.({ type: "error", message: "File tidak valid" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("category", values.category);
      formData.append("scope", values.scope);
      if (values.refTermId) formData.append("refTermId", values.refTermId);
      if (values.refClassId) formData.append("refClassId", values.refClassId);
      if (values.refStudentId) formData.append("refStudentId", values.refStudentId);
      formData.append("file", file);
      await httpClient.post("/archives", formData);
      notify?.({ type: "success", message: "Arsip diunggah" });
      setUploadOpen(false);
      uploadForm.resetFields();
      setFileList([]);
      await archivesQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal mengunggah arsip", description: String(error) });
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          size: file.size,
          type: file.type,
          originFileObj: file as any,
        } as any,
      ]);
      return false;
    },
    fileList,
    onRemove: () => setFileList([]),
    maxCount: 1,
  };

  return (
    <ResourceActionGuard action="list" resourceName="archives">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Arsip Dokumen
          </Typography.Title>

          <Card
            title="Daftar Arsip"
            extra={
              <Space>
                <Segmented
                  value={scopeFilter}
                  onChange={(v) => setScopeFilter(v as string)}
                  options={[{ label: "Semua", value: "ALL" }, ...SCOPE_OPTIONS]}
                />
                <Button
                  type="primary"
                  onClick={() => {
                    setUploadOpen(true);
                    uploadForm.resetFields();
                    setFileList([]);
                  }}
                >
                  Unggah Arsip
                </Button>
              </Space>
            }
          >
            {archives.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Belum ada arsip"
                description="Unggah rapor, absensi, atau dokumen lain."
              />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={archives}
                renderItem={(item) => {
                  const scope = item.scope ?? "GLOBAL";
                  const title = item.title ?? item.label ?? item.fileName ?? "Arsip";
                  const category = item.category ?? item.type ?? "-";
                  const size = item.sizeBytes ?? item.fileSize ?? 0;
                  const uploadedBy = item.uploadedBy ?? item.generatedBy ?? "-";
                  const uploadedAt = item.uploadedAt ?? item.generatedAt;
                  return (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button key="download" onClick={() => handleDownload(item)}>
                          Unduh
                        </Button>,
                        <Button key="delete" danger onClick={() => handleDelete(item.id)}>
                          Hapus
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={8} wrap>
                            <Typography.Text strong>{title}</Typography.Text>
                            <Tag color={SCOPE_COLORS[scope] ?? "default"}>
                              {SCOPE_LABELS[scope] ?? scope}
                            </Tag>
                            <Tag>{category}</Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            <Typography.Text type="secondary">
                              {item.fileName ?? item.filePath ?? "-"} • {formatBytes(size)}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              Diunggah oleh {uploadedBy} • {formatDate(uploadedAt)}
                            </Typography.Text>
                            {item.termName && (
                              <Typography.Text type="secondary">
                                Term: {item.termName}
                              </Typography.Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Space>
      </div>

      <Modal
        open={uploadOpen}
        title="Unggah Arsip"
        okText="Unggah"
        cancelText="Batal"
        confirmLoading={uploading}
        onCancel={() => setUploadOpen(false)}
        onOk={() => uploadForm.submit()}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{ scope: "GLOBAL" }}
        >
          <Form.Item
            label="Judul"
            name="title"
            rules={[{ required: true, message: "Judul wajib diisi" }]}
          >
            <Input placeholder="mis. Rapor Semester Ganjil" />
          </Form.Item>
          <Form.Item
            label="Kategori"
            name="category"
            rules={[{ required: true, message: "Kategori wajib diisi" }]}
          >
            <Input placeholder="mis. REPORT_PDF" />
          </Form.Item>
          <Form.Item label="Cakupan" name="scope" rules={[{ required: true }]}>
            <Select options={SCOPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="Term (opsional)" name="refTermId">
            <Select
              allowClear
              placeholder="Pilih term"
              options={terms.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item label="Kelas (opsional)" name="refClassId">
            <Select
              allowClear
              placeholder="Pilih kelas"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item label="File" required>
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Klik atau seret file ke sini</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </ResourceActionGuard>
  );
};
