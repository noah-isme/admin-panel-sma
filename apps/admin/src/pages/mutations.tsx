import React, { useCallback, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  Menu,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDataProvider, useList } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

const TYPE_LABELS: Record<string, string> = {
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  PROMOTION: "Kenaikan Kelas",
  GRADUATION: "Lulus",
  DROPOUT: "Putus Sekolah",
};

export const MutationListPage: React.FC = () => {
  const getDataProvider = useDataProvider();
  const dataProvider = useMemo(() => getDataProvider(), [getDataProvider]);
  const { open: notify } = useAppNotification();

  const [searchForm] = Form.useForm();
  const [selectedMutation, setSelectedMutation] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewMutation, setReviewMutation] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewComment, setReviewComment] = useState("");

  const searchValues = useMemo(() => searchForm.getFieldsValue(), [searchForm]);

  const mutationsQuery = useList({
    resource: "mutations",
    pagination: { current: 1, pageSize: 20 },
    sorters: [{ field: "createdAt", order: "desc" }],
    filters: [
      ...(searchValues.studentId
        ? [{ field: "studentId", operator: "eq", value: searchValues.studentId }]
        : []),
      ...(searchValues.type ? [{ field: "type", operator: "eq", value: searchValues.type }] : []),
      ...(searchValues.status
        ? [{ field: "status", operator: "eq", value: searchValues.status }]
        : []),
    ],
  });

  const columns = useMemo(
    () => [
      {
        title: "Siswa",
        dataIndex: "studentName",
        key: "studentName",
        width: 180,
        render: (_, record) => (
          <Space>
            <Avatar icon={<UserOutlined />} size={28} />
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{record.studentName}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.studentId}
              </Typography.Text>
            </Space>
          </Space>
        ),
      },
      {
        title: "Jenis",
        dataIndex: "type",
        key: "type",
        width: 140,
        render: (type: string) => (
          <Tag color={TYPE_LABELS[type] ? "blue" : "default"}>{TYPE_LABELS[type] ?? type}</Tag>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: string) => (
          <Badge
            status={
              status === "APPROVED" ? "success" : status === "REJECTED" ? "error" : "processing"
            }
            text={status}
          />
        ),
      },
      {
        title: "Dari Kelas",
        dataIndex: "fromClassId",
        key: "fromClassId",
        width: 140,
      },
      {
        title: "Ke Kelas",
        dataIndex: "toClassId",
        key: "toClassId",
        width: 140,
      },
      {
        title: "Tanggal Efektif",
        dataIndex: "effectiveDate",
        key: "effectiveDate",
        width: 140,
        render: (date: string) => dayjs(date).format("DD MMM YYYY"),
      },
      {
        title: "Diajukan Oleh",
        dataIndex: "requestedBy",
        key: "requestedBy",
        width: 140,
      },
      {
        title: "Disetujui Oleh",
        dataIndex: "approvedBy",
        key: "approvedBy",
        width: 140,
      },
      {
        title: "Aksi",
        key: "actions",
        width: 120,
        fixed: "right" as const,
        render: (_: any, record: any) => (
          <Space size={4}>
            <Tooltip title="Detail">
              <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)} />
            </Tooltip>
            {record.status === "PENDING" && (
              <>
                <Tooltip title="Setujui">
                  <Button
                    type="link"
                    icon={<CheckCircleOutlined />}
                    danger={false}
                    onClick={() => handleReview(record, "approve")}
                  />
                </Tooltip>
                <Tooltip title="Tolak">
                  <Button
                    type="link"
                    icon={<CloseCircleOutlined />}
                    danger
                    onClick={() => handleReview(record, "reject")}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        ),
      },
    ],
    []
  );

  const handleView = useCallback((record: any) => {
    setSelectedMutation(record);
    setDetailVisible(true);
  }, []);

  const handleReview = useCallback((record: any, action: "approve" | "reject") => {
    setReviewMutation(record);
    setReviewAction(action);
    setReviewComment("");
    setReviewVisible(true);
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewMutation) return;

    try {
      const endpoint =
        reviewAction === "approve"
          ? `mutations/${reviewMutation.id}/approve`
          : `mutations/${reviewMutation.id}/reject`;
      await dataProvider.custom({
        url: endpoint,
        method: "patch",
        payload: { comment: reviewComment },
      });
      notify?.({
        type: "success",
        message: `Mutasi ${reviewAction === "approve" ? "disetujui" : "ditolak"}`,
      });
      setReviewVisible(false);
      mutationsQuery.refetch();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal memproses review" });
    }
  };

  const mutations = mutationsQuery.data?.data ?? [];
  const isLoading = mutationsQuery.isLoading;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Manajemen Mutasi Siswa
        </Typography.Title>
        <Typography.Text type="secondary">
          Kelola mutasi siswa: transfer masuk/keluar, kenaikan kelas, kelulusan, dan putus sekolah.
        </Typography.Text>
      </Space>

      <Card>
        <Form form={searchForm} layout="inline" onFinish={() => mutationsQuery.refetch()}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Siswa" name="studentId">
                <Input placeholder="ID Siswa" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Jenis Mutasi" name="type">
                <Select
                  placeholder="Semua jenis"
                  allowClear
                  options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Status" name="status">
                <Select
                  placeholder="Semua status"
                  allowClear
                  options={[
                    { label: "Pending", value: "PENDING" },
                    { label: "Approved", value: "APPROVED" },
                    { label: "Rejected", value: "REJECTED" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space style={{ marginTop: 24 }}>
                <Button type="primary" htmlType="submit" icon={<FileTextOutlined />}>
                  Cari
                </Button>
                <Button htmlType="button" onClick={() => searchForm.resetFields()}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={mutations}
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Detail Mutasi & Audit Trail"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
      >
        {selectedMutation && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Informasi Mutasi" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Typography.Text type="secondary">Jenis</Typography.Text>
                  <Typography.Text strong>
                    {TYPE_LABELS[selectedMutation.type] ?? selectedMutation.type}
                  </Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Status</Typography.Text>
                  <Badge
                    status={
                      selectedMutation.status === "APPROVED"
                        ? "success"
                        : selectedMutation.status === "REJECTED"
                          ? "error"
                          : "processing"
                    }
                    text={selectedMutation.status}
                  />
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Siswa</Typography.Text>
                  <Typography.Text>
                    {selectedMutation.studentName} ({selectedMutation.studentId})
                  </Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Tanggal Efektif</Typography.Text>
                  <Typography.Text>
                    {dayjs(selectedMutation.effectiveDate).format("DD MMMM YYYY")}
                  </Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Dari Kelas</Typography.Text>
                  <Typography.Text>{selectedMutation.fromClassId ?? "-"}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Ke Kelas</Typography.Text>
                  <Typography.Text>{selectedMutation.toClassId ?? "-"}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Diajukan Oleh</Typography.Text>
                  <Typography.Text>{selectedMutation.requestedBy}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Alasan</Typography.Text>
                  <Typography.Text>{selectedMutation.reason}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Disetujui Oleh</Typography.Text>
                  <Typography.Text>{selectedMutation.approvedBy ?? "-"}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Waktu Persetujuan</Typography.Text>
                  <Typography.Text>
                    {selectedMutation.approvedAt
                      ? dayjs(selectedMutation.approvedAt).format("DD MMMM YYYY HH:mm")
                      : "-"}
                  </Typography.Text>
                </Col>
              </Row>
            </Card>

            <Card title="Audit Trail" size="small">
              {selectedMutation.auditTrail && selectedMutation.auditTrail.length > 0 ? (
                <Table
                  size="small"
                  rowKey="id"
                  columns={[
                    {
                      title: "Waktu",
                      dataIndex: "timestamp",
                      key: "timestamp",
                      render: (v: string) => dayjs(v).format("DD MMM YYYY HH:mm"),
                    },
                    { title: "Aksi", dataIndex: "action", key: "action" },
                    { title: "Oleh", dataIndex: "actor", key: "actor" },
                    { title: "Detail", dataIndex: "details", key: "details" },
                  ]}
                  dataSource={selectedMutation.auditTrail}
                  pagination={false}
                />
              ) : (
                <Typography.Text type="secondary">Belum ada audit trail</Typography.Text>
              )}
            </Card>
          </Space>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        title={reviewAction === "approve" ? "Setujui Mutasi" : "Tolak Mutasi"}
        open={reviewVisible}
        onCancel={() => setReviewVisible(false)}
        width={500}
        footer={[
          <Button key="cancel" onClick={() => setReviewVisible(false)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger={reviewAction === "reject"}
            loading={false}
            onClick={handleSubmitReview}
          >
            {reviewAction === "approve" ? "Setujui" : "Tolak"}
          </Button>,
        ]}
      >
        {reviewMutation && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Typography.Text>
              {reviewAction === "approve" ? "Anda akan menyetujui" : "Anda akan menolak"} mutasi
              untuk
              <Typography.Text strong> {reviewMutation.studentName}</Typography.Text>
            </Typography.Text>
            <Form.Item label="Catatan (opsional)" name="comment">
              <Input.TextArea
                rows={3}
                placeholder={`Alasan ${reviewAction === "approve" ? "persetujuan" : "penolakan"}`}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </Form.Item>
          </Space>
        )}
      </Modal>
    </Space>
  );
};
