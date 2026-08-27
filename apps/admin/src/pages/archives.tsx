import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileOutlined,
  PlusOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDataProvider, useList } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// react-pdf@9 ships pdfjs-dist >= 4.8 which is patched for CVE-2024-4367.
// Use the bundled version constant to load the matching worker at runtime.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const CATEGORY_COLORS: Record<string, string> = {
  RAPOR: "blue",
  CERTIFICATE: "gold",
  TRANSCRIPT: "purple",
  PHOTO: "green",
  OTHER: "default",
};

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes("pdf"))
    return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />;
  if (mimeType?.includes("word") || mimeType?.includes("document"))
    return <FileWordOutlined style={{ color: "#2f54eb", fontSize: 24 }} />;
  if (mimeType?.includes("image"))
    return <FileImageOutlined style={{ color: "#52c41a", fontSize: 24 }} />;
  return <FileOutlined style={{ color: "#8c8c8c", fontSize: 24 }} />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ArchiveListPage: React.FC = () => {
  const getDataProvider = useDataProvider();
  const dataProvider = useMemo(() => getDataProvider(), [getDataProvider]);
  const { open: notify } = useAppNotification();
  const [numPages, setNumPages] = useState<number>(0);

  const [searchForm] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [selectedArchive, setSelectedArchive] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const searchValues = useMemo(() => searchForm.getFieldsValue(), [searchForm]);

  const archivesQuery = useList({
    resource: "archives",
    pagination: { current: 1, pageSize: 20 },
    sorters: [{ field: "uploadedAt", order: "desc" }],
    filters: [
      ...(searchValues.category
        ? [{ field: "category", operator: "eq" as const, value: searchValues.category }]
        : []),
      ...(searchValues.studentId
        ? [{ field: "studentId", operator: "eq" as const, value: searchValues.studentId }]
        : []),
      ...(searchValues.termId
        ? [{ field: "termId", operator: "eq" as const, value: searchValues.termId }]
        : []),
    ],
  });

  const columns = useMemo(
    () => [
      {
        title: "Dokumen",
        dataIndex: "fileName",
        key: "fileName",
        width: 200,
        render: (_: any, record: any) => (
          <Space>
            {getFileIcon(record.mimeType)}
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{record.originalName ?? record.fileName}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.fileName}
              </Typography.Text>
            </Space>
          </Space>
        ),
      },
      {
        title: "Kategori",
        dataIndex: "category",
        key: "category",
        width: 120,
        render: (category: string) => (
          <Tag color={CATEGORY_COLORS[category] ?? "default"}>{category}</Tag>
        ),
      },
      {
        title: "Status",
        key: "status",
        width: 130,
        render: (_: any, record: any) => (
          <Space direction="vertical" size={2}>
            {record.ocrStatus === "COMPLETED" && <Tag color="blue">OCR</Tag>}
            {record.legalHold && (
              <Tag icon={<WarningOutlined />} color="error">
                Legal Hold
              </Tag>
            )}
            {record.retainUntil && (
              <Tooltip title={`Retain until ${dayjs(record.retainUntil).format("DD MMM YYYY")}`}>
                <Tag color={dayjs(record.retainUntil).isBefore(dayjs()) ? "warning" : "success"}>
                  Retention
                </Tag>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: "Siswa",
        dataIndex: "studentId",
        key: "studentId",
        width: 160,
      },
      {
        title: "Term",
        dataIndex: "termId",
        key: "termId",
        width: 120,
      },
      {
        title: "Ukuran",
        dataIndex: "fileSize",
        key: "fileSize",
        width: 100,
        render: (size: number) => formatFileSize(size),
        align: "right" as const,
      },
      {
        title: "Diunggah Oleh",
        dataIndex: "uploadedBy",
        key: "uploadedBy",
        width: 140,
      },
      {
        title: "Waktu",
        dataIndex: "uploadedAt",
        key: "uploadedAt",
        width: 160,
        render: (date: string) => dayjs(date).format("DD MMM YYYY HH:mm"),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 120,
        fixed: "right" as const,
        render: (_: any, record: any) => (
          <Space size={4}>
            <Tooltip title="Pratinjau">
              <Button type="link" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
            </Tooltip>
            <Tooltip title="Unduh">
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Hapus arsip ini?"
              onConfirm={() => handleDelete(record.id)}
              okText="Ya"
              cancelText="Tidak"
            >
              <Tooltip title="Hapus">
                <Button type="link" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  const handlePreview = useCallback((record: any) => {
    setSelectedArchive(record);
    setPreviewVisible(true);
    setPreviewVisible(true);
  }, []);

  const handleUpload = useCallback(
    async (file: File, category: string, studentId: string, termId: string) => {
      setUploadLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("studentId", studentId);
        formData.append("termId", termId);

        if (!dataProvider.custom) return;
        await dataProvider.custom({
          url: "archives/upload",
          method: "post",
          payload: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        notify?.({ type: "success", message: "Dokumen berhasil diunggah" });
        setUploadVisible(false);
        archivesQuery.refetch();
      } catch (_error) {
        notify?.({ type: "error", message: "Gagal mengunggah dokumen" });
      } finally {
        setUploadLoading(false);
      }
    },
    [dataProvider, notify, archivesQuery]
  );

  const handleUploadSubmit = useCallback(
    async (values: any) => {
      const { file, category, studentId, termId } = values;
      if (!file) return;
      await handleUpload(file, category, studentId, termId);
    },
    [handleUpload]
  );

  const handleDownload = useCallback(
    async (record: any) => {
      try {
        if (!dataProvider.custom) return;
        const response = await dataProvider.custom({
          url: `archives/${record.id}/download`,
          method: "get",
        });
        const url = (response as any)?.url;
        if (url) {
          window.open(url, "_blank");
        } else {
          notify?.({ type: "error", message: "Gagal mendapatkan URL unduh" });
        }
      } catch (_error) {
        notify?.({ type: "error", message: "Gagal mengunduh dokumen" });
      }
    },
    [dataProvider, notify]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        if (!dataProvider.custom) return;
        await dataProvider.custom({
          url: `archives/${id}`,
          method: "delete",
        });
        notify?.({ type: "success", message: "Arsip berhasil dihapus" });
        archivesQuery.refetch();
      } catch (_error) {
        notify?.({ type: "error", message: "Gagal menghapus arsip" });
      }
    },
    [dataProvider, notify, archivesQuery]
  );

  const handleBulkAction = useCallback(
    async (action: string) => {
      if (!selectedRowKeys.length) return;
      setBulkActionLoading(true);
      try {
        if (!dataProvider.custom) return;
        if (action === "DELETE") {
          await dataProvider.custom({
            url: "archives/bulk",
            method: "post",
            payload: { action, ids: selectedRowKeys },
          });
          notify?.({
            type: "success",
            message: `${selectedRowKeys.length} arsip berhasil dihapus`,
          });
          setSelectedRowKeys([]);
          archivesQuery.refetch();
        } else if (action === "DOWNLOAD") {
          await dataProvider.custom({
            url: "archives/bulk",
            method: "post",
            payload: { action, ids: selectedRowKeys },
          });
          notify?.({ type: "success", message: "Permintaan unduh massal sedang diproses" });
        }
      } catch (_error) {
        notify?.({ type: "error", message: "Aksi massal gagal" });
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedRowKeys, dataProvider, notify, archivesQuery]
  );

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const archives = archivesQuery.data?.data ?? [];
  const isLoading = archivesQuery.isLoading;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Manajemen Arsip & Dokumen
        </Typography.Title>
        <Typography.Text type="secondary">
          Kelola dokumen siswa, rapor digital, sertifikat, dan transkrip nilai.
        </Typography.Text>
      </Space>

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Kategori" name="category">
              <Select
                placeholder="Semua kategori"
                allowClear
                options={Object.keys(CATEGORY_COLORS).map((value) => ({
                  label: value,
                  value,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Siswa" name="studentId">
              <Input placeholder="ID Siswa" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Term" name="termId">
              <Input placeholder="ID Term" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadVisible(true)}>
                <UploadOutlined /> Unggah Baru
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        {selectedRowKeys.length > 0 && (
          <Space style={{ marginBottom: 16 }} className="bulk-actions-toolbar">
            <Typography.Text strong>{selectedRowKeys.length} dipilih</Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleBulkAction("DOWNLOAD")}
              loading={bulkActionLoading}
            >
              Unduh Massal
            </Button>
            <Popconfirm
              title={`Hapus ${selectedRowKeys.length} dokumen terpilih?`}
              onConfirm={() => handleBulkAction("DELETE")}
            >
              <Button danger icon={<DeleteOutlined />} loading={bulkActionLoading}>
                Hapus Massal
              </Button>
            </Popconfirm>
          </Space>
        )}
        <Table
          rowSelection={rowSelection}
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={archives}
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      {/* Preview Modal */}
      <Modal
        title="Pratinjau Dokumen"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        footer={null}
      >
        {selectedArchive && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Informasi Dokumen" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Typography.Text type="secondary">Nama Asli</Typography.Text>
                  <Typography.Text strong>
                    {selectedArchive.originalName ?? selectedArchive.fileName}
                  </Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Kategori</Typography.Text>
                  <Tag color={CATEGORY_COLORS[selectedArchive.category] ?? "default"}>
                    {selectedArchive.category}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Siswa</Typography.Text>
                  <Typography.Text>{selectedArchive.studentId}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Term</Typography.Text>
                  <Typography.Text>{selectedArchive.termId}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Ukuran File</Typography.Text>
                  <Typography.Text>{formatFileSize(selectedArchive.fileSize)}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Tipe MIME</Typography.Text>
                  <Typography.Text>{selectedArchive.mimeType}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Diunggah Oleh</Typography.Text>
                  <Typography.Text>{selectedArchive.uploadedBy}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Waktu Unggah</Typography.Text>
                  <Typography.Text>
                    {dayjs(selectedArchive.uploadedAt).format("DD MMMM YYYY HH:mm")}
                  </Typography.Text>
                </Col>
              </Row>
            </Card>

            <Card title="Pratinjau" size="small">
              {selectedArchive.mimeType?.includes("pdf") ? (
                <div style={{ height: "600px", overflow: "auto" }}>
                  <Document
                    file={selectedArchive.url || "sample"}
                    onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  >
                    {Array.from(new Array(numPages), (_, index) => (
                      <Page key={`page_${index + 1}`} pageNumber={index + 1} width={560} />
                    ))}
                  </Document>
                </div>
              ) : selectedArchive.mimeType?.includes("image") ? (
                <img
                  src={selectedArchive.url}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: 600 }}
                />
              ) : (
                <Space
                  direction="vertical"
                  size={16}
                  style={{ width: "100%", textAlign: "center" }}
                >
                  {getFileIcon(selectedArchive.mimeType)}
                  <Typography.Text type="secondary">
                    Pratinjau tidak tersedia untuk tipe file ini
                  </Typography.Text>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(selectedArchive)}
                  >
                    Unduh untuk Melihat
                  </Button>
                </Space>
              )}
            </Card>
          </Space>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        title="Unggah Dokumen Baru"
        open={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        width={500}
        footer={[
          <Button key="cancel" onClick={() => setUploadVisible(false)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploadLoading}
            onClick={() => uploadForm.validateFields().then(handleUploadSubmit)}
          >
            Unggah
          </Button>,
        ]}
      >
        <Form
          layout="vertical"
          form={uploadForm}
          initialValues={{ category: "RAPOR" }}
          onFinish={handleUploadSubmit}
        >
          <Form.Item label="File" name="file" rules={[{ required: true }]}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => uploadForm.setFieldsValue({ file: e.target.files?.[0] })}
              style={{ display: "none" }}
              id="archive-file-input"
            />
            <Button
              type="dashed"
              block
              icon={<UploadOutlined />}
              onClick={() => document.getElementById("archive-file-input")?.click()}
            >
              Klik atau seret file ke sini
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Format: PDF, DOC, DOCX, JPG, PNG. Maksimal 10MB.
            </Typography.Text>
          </Form.Item>

          <Form.Item label="Kategori" name="category" rules={[{ required: true }]}>
            <Select
              options={Object.entries(CATEGORY_COLORS).map(([value]) => ({ label: value, value }))}
            />
          </Form.Item>

          <Form.Item label="Siswa" name="studentId" rules={[{ required: true }]}>
            <Input placeholder="ID Siswa" />
          </Form.Item>

          <Form.Item label="Term" name="termId" rules={[{ required: true }]}>
            <Input placeholder="ID Term" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ArchiveListPage;
