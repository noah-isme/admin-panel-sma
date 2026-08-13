import React, { useCallback, useMemo, useState } from "react";
import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { List as RefineList, useTable } from "@refinedev/antd";
import { useDelete, useList, useNavigation } from "@refinedev/core";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { useAppNotification } from "../hooks/use-app-notification";

type EnrollmentRecord = {
  id: string;
  studentId: string;
  studentName?: string;
  studentNis?: string;
  classId: string;
  className?: string;
  termId: string;
  termName?: string;
  status?: "ACTIVE" | "TRANSFERRED" | "LEFT" | string;
  joinedAt?: string;
  leftAt?: string;
};

type LookupRecord = { id: string; name?: string; code?: string };

const statusColor: Record<string, string> = {
  ACTIVE: "green",
  TRANSFERRED: "gold",
  LEFT: "default",
};

const formatDate = (value?: string) => {
  if (!value) return "–";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

export const EnrollmentsPage: React.FC = () => {
  const { create, edit } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteOne, isLoading: isDeleting } = useDelete();
  const { tableProps, setFilters, tableQueryResult } = useTable<EnrollmentRecord>({
    resource: "enrollments",
    pagination: { current: 1, pageSize: 20 },
  });
  const [classId, setClassId] = useState<string>();
  const [termId, setTermId] = useState<string>();
  const [status, setStatus] = useState<string>();
  const classesQuery = useList<LookupRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
  });
  const termsQuery = useList<LookupRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 100 },
  });

  const classes = classesQuery.data?.data ?? [];
  const terms = termsQuery.data?.data ?? [];

  const applyFilters = useCallback(
    (next: { classId?: string; termId?: string; status?: string }) => {
      const filters = [] as Array<{ field: string; operator: "eq"; value: string }>;
      if (next.classId) filters.push({ field: "classId", operator: "eq", value: next.classId });
      if (next.termId) filters.push({ field: "termId", operator: "eq", value: next.termId });
      if (next.status) filters.push({ field: "status", operator: "eq", value: next.status });
      setFilters(filters, "replace");
    },
    [setFilters]
  );

  const handleUnenroll = useCallback(
    (id: string) => {
      deleteOne(
        { resource: "enrollments", id },
        {
          onSuccess: () => {
            notify?.({ type: "success", message: "Penempatan siswa dibatalkan" });
            void tableQueryResult?.refetch();
          },
          onError: () => notify?.({ type: "error", message: "Gagal membatalkan penempatan" }),
        }
      );
    },
    [deleteOne, notify, tableQueryResult]
  );

  const columns = useMemo<ColumnsType<EnrollmentRecord>>(
    () => [
      {
        title: "Siswa",
        key: "student",
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.studentName ?? record.studentId}</Typography.Text>
            <Typography.Text type="secondary">NIS {record.studentNis ?? "–"}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Kelas",
        key: "class",
        render: (_, record) => record.className ?? record.classId,
      },
      {
        title: "Tahun Ajaran",
        key: "term",
        render: (_, record) => record.termName ?? record.termId,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 150,
        render: (value?: string) => (
          <Tag color={statusColor[value ?? ""]}>
            {value === "ACTIVE" ? "Aktif" : (value ?? "–")}
          </Tag>
        ),
      },
      {
        title: "Mulai",
        dataIndex: "joinedAt",
        key: "joinedAt",
        width: 150,
        render: (value?: string) => formatDate(value),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 260,
        render: (_, record) => {
          const active = record.status === "ACTIVE" || !record.status;
          return (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => edit("enrollments", record.id)}>
                Pindah Kelas
              </Button>
              <Popconfirm
                title="Batalkan penempatan?"
                description="Penempatan akan ditandai sebagai tidak aktif dan riwayatnya dipertahankan."
                okText="Batalkan"
                cancelText="Kembali"
                onConfirm={() => handleUnenroll(record.id)}
                disabled={!active}
              >
                <Button danger disabled={!active} loading={isDeleting}>
                  Batalkan
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [edit, handleUnenroll, isDeleting]
  );

  return (
    <ResourceActionGuard action="list" resourceName="enrollments">
      <RefineList
        title="Penempatan Siswa"
        headerButtons={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => create("enrollments")}>
            Tambah Penempatan
          </Button>
        }
      >
        <Space wrap style={{ width: "100%", marginBottom: 16 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={classId}
            placeholder="Kelas"
            style={{ width: 220 }}
            loading={classesQuery.isLoading}
            options={classes.map((item) => ({
              value: item.id,
              label: item.name ?? item.code ?? item.id,
            }))}
            onChange={(value) => {
              setClassId(value);
              applyFilters({ classId: value, termId, status });
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={termId}
            placeholder="Tahun ajaran"
            style={{ width: 220 }}
            loading={termsQuery.isLoading}
            options={terms.map((item) => ({ value: item.id, label: item.name ?? item.id }))}
            onChange={(value) => {
              setTermId(value);
              applyFilters({ classId, termId: value, status });
            }}
          />
          <Select
            allowClear
            value={status}
            placeholder="Status"
            style={{ width: 170 }}
            options={[
              { value: "ACTIVE", label: "Aktif" },
              { value: "TRANSFERRED", label: "Dipindahkan" },
              { value: "LEFT", label: "Keluar" },
            ]}
            onChange={(value) => {
              setStatus(value);
              applyFilters({ classId, termId, status: value });
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setClassId(undefined);
              setTermId(undefined);
              setStatus(undefined);
              applyFilters({});
            }}
          >
            Reset
          </Button>
        </Space>
        <Table
          {...tableProps}
          rowKey="id"
          columns={columns}
          loading={tableProps.loading || isDeleting}
          locale={{ emptyText: "Belum ada penempatan siswa" }}
        />
      </RefineList>
    </ResourceActionGuard>
  );
};
