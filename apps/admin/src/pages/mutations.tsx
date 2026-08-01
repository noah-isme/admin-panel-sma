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
} from "antd";
import dayjs from "dayjs";
import { useCan, useCreate, useList, useNotification } from "@refinedev/core";
import { httpClient } from "../providers/dataProvider";
import { ResourceActionGuard } from "../components/resource-action-guard";

const MUTATION_TYPE_OPTIONS = [
  { label: "Data Siswa", value: "STUDENT_DATA" },
  { label: "Koreksi Nilai", value: "GRADE_CORRECTION" },
  { label: "Koreksi Absensi", value: "ATTENDANCE_CORRECTION" },
  { label: "Perpindahan Kelas", value: "CLASS_CHANGE" },
  { label: "Lainnya", value: "OTHER" },
];

const MUTATION_TYPE_LABELS: Record<string, string> = {
  STUDENT_DATA: "Data Siswa",
  GRADE_CORRECTION: "Koreksi Nilai",
  ATTENDANCE_CORRECTION: "Koreksi Absensi",
  CLASS_CHANGE: "Perpindahan Kelas",
  OTHER: "Lainnya",
  IN: "Mutasi Masuk",
  OUT: "Mutasi Keluar",
  INTERNAL: "Pindah Kelas",
};

const STATUS_OPTIONS = [
  { label: "Semua", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Disetujui", value: "APPROVED" },
  { label: "Ditolak", value: "REJECTED" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-";

type ReviewValues = { note?: string };

export const MutationsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reviewTarget, setReviewTarget] = useState<Record<string, any> | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm] = Form.useForm<ReviewValues>();
  const { open: notify } = useNotification();
  const { mutateAsync: createMutationReq } = useCreate();
  const { data: canReview } = useCan({ resource: "mutations", action: "approve" });

  const mutationsQuery = useList({
    resource: "mutations",
    pagination: { current: 1, pageSize: 200 },
  });

  const mutations = useMemo(() => {
    const data = (mutationsQuery.data?.data as Record<string, any>[]) ?? [];
    if (statusFilter === "ALL") return data;
    return data.filter((item) => (item.status ?? "PENDING") === statusFilter);
  }, [mutationsQuery.data?.data, statusFilter]);

  const handleCreate = async (values: {
    type: string;
    entity: string;
    entityId: string;
    reason: string;
    requestedChanges?: string;
  }) => {
    let parsedChanges: unknown = {};
    if (values.requestedChanges?.trim()) {
      try {
        parsedChanges = JSON.parse(values.requestedChanges);
      } catch {
        notify?.({ type: "error", message: "Perubahan diminta harus JSON valid" });
        return;
      }
    }
    try {
      await createMutationReq({
        resource: "mutations",
        values: {
          type: values.type,
          entity: values.entity,
          entityId: values.entityId,
          reason: values.reason,
          requestedChanges: parsedChanges,
        },
      });
      notify?.({ type: "success", message: "Permohonan mutasi dibuat" });
      await mutationsQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal membuat permohonan", description: String(error) });
    }
  };

  const openReview = (item: Record<string, any>, decision: "APPROVED" | "REJECTED") => {
    setReviewTarget(item);
    setReviewDecision(decision);
    reviewForm.resetFields();
  };

  const handleReview = async (values: ReviewValues) => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await httpClient.post(`/mutations/${reviewTarget.id}/review`, {
        status: reviewDecision,
        note: values.note ?? "",
      });
      notify?.({
        type: "success",
        message: reviewDecision === "APPROVED" ? "Mutasi disetujui" : "Mutasi ditolak",
      });
      setReviewTarget(null);
      await mutationsQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal memproses review", description: String(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResourceActionGuard action="list" resourceName="mutations">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Mutasi & Permohonan Perubahan
          </Typography.Title>

          <Card title="Ajukan Permohonan">
            <Form layout="vertical" onFinish={handleCreate}>
              <Form.Item
                label="Jenis Perubahan"
                name="type"
                rules={[{ required: true, message: "Pilih jenis" }]}
              >
                <Select options={MUTATION_TYPE_OPTIONS} placeholder="Pilih jenis perubahan" />
              </Form.Item>
              <Form.Item
                label="Entitas"
                name="entity"
                rules={[{ required: true, message: "Entitas wajib diisi" }]}
              >
                <Input placeholder="mis. student" />
              </Form.Item>
              <Form.Item
                label="ID Entitas"
                name="entityId"
                rules={[{ required: true, message: "ID entitas wajib diisi" }]}
              >
                <Input placeholder="mis. std-001" />
              </Form.Item>
              <Form.Item
                label="Alasan"
                name="reason"
                rules={[{ required: true, message: "Alasan wajib diisi" }]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="Jelaskan alasan perubahan"
                />
              </Form.Item>
              <Form.Item
                label="Perubahan Diminta (JSON opsional)"
                name="requestedChanges"
                tooltip="Format JSON, opsional"
              >
                <Input.TextArea
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  placeholder='{"field":"value"}'
                />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Kirim Permohonan
              </Button>
            </Form>
          </Card>

          <Card
            title="Daftar Permohonan"
            extra={
              <Segmented
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as string)}
                options={STATUS_OPTIONS}
              />
            }
          >
            {mutations.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Belum ada permohonan"
                description="Permohonan mutasi akan tampil di sini."
              />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={mutations}
                renderItem={(item) => {
                  const status = item.status ?? "PENDING";
                  const isPending = status === "PENDING";
                  const typeLabel = MUTATION_TYPE_LABELS[item.type] ?? item.type;
                  return (
                    <List.Item
                      key={item.id}
                      actions={
                        isPending && canReview?.can
                          ? [
                              <Button
                                key="approve"
                                type="primary"
                                onClick={() => openReview(item, "APPROVED")}
                              >
                                Setujui
                              </Button>,
                              <Button
                                key="reject"
                                danger
                                onClick={() => openReview(item, "REJECTED")}
                              >
                                Tolak
                              </Button>,
                            ]
                          : undefined
                      }
                    >
                      <List.Item.Meta
                        title={
                          <Space size={8} wrap>
                            <Typography.Text strong>
                              {item.studentName ?? item.entityId}
                            </Typography.Text>
                            <Tag color="blue">{typeLabel}</Tag>
                            <Tag color={STATUS_COLORS[status] ?? "default"}>{status}</Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            <Typography.Text type="secondary">
                              Entitas: {item.entity ?? "-"} • {item.entityId ?? "-"}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              Diajukan: {formatDate(item.requestedAt ?? item.effectiveDate)} oleh{" "}
                              {item.requestedBy ?? item.handledByName ?? "-"}
                            </Typography.Text>
                            {(item.fromClassName || item.toClassName) && (
                              <Typography.Text type="secondary">
                                {item.fromClassName ?? "-"} → {item.toClassName ?? "-"}
                              </Typography.Text>
                            )}
                            {item.reviewedBy && (
                              <Typography.Text type="secondary">
                                Review: {item.reviewedBy} • {formatDate(item.reviewedAt)}
                              </Typography.Text>
                            )}
                          </Space>
                        }
                      />
                      <Typography.Paragraph style={{ marginBottom: item.note ? 8 : 0 }}>
                        {item.reason}
                      </Typography.Paragraph>
                      {item.note && (
                        <Typography.Text type="secondary">
                          Catatan review: {item.note}
                        </Typography.Text>
                      )}
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Space>
      </div>

      <Modal
        open={Boolean(reviewTarget)}
        title={reviewDecision === "APPROVED" ? "Setujui Permohonan" : "Tolak Permohonan"}
        okText="Kirim"
        cancelText="Batal"
        okButtonProps={{ danger: reviewDecision === "REJECTED" }}
        confirmLoading={submitting}
        onCancel={() => setReviewTarget(null)}
        onOk={() => reviewForm.submit()}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item label="Catatan (opsional)" name="note">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Catatan untuk pemohon"
            />
          </Form.Item>
        </Form>
      </Modal>
    </ResourceActionGuard>
  );
};
