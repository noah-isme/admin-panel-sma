import React, { useCallback, useMemo, useState } from "react";
import { EditOutlined, PlusOutlined, ReloadOutlined, StarFilled } from "@ant-design/icons";
import { Button, DatePicker, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { List as RefineList, useTable } from "@refinedev/antd";
import { useDelete, useNavigation } from "@refinedev/core";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { useAppNotification } from "../hooks/use-app-notification";
import { httpClient } from "../providers/dataProvider";
import { TERM_TYPES } from "../utils/terms";

type TermRecord = {
  id: string;
  name: string;
  type?: string;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  active?: boolean;
};

const isActiveTerm = (record: TermRecord) => record.isActive ?? record.active ?? false;

const formatDate = (value?: string) => {
  if (!value) return "–";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

export const TermsPage: React.FC = () => {
  const { create, edit } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteOne, isLoading: isDeleting } = useDelete();
  const { tableProps, setFilters, tableQueryResult } = useTable<TermRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 20 },
  });
  const [academicYear, setAcademicYear] = useState("");
  const [type, setType] = useState<string>();
  const [active, setActive] = useState<string>();

  const applyFilters = useCallback(
    (next: { academicYear?: string; type?: string; active?: string }) => {
      const filters = [] as Array<{ field: string; operator: "contains" | "eq"; value: unknown }>;
      if (next.academicYear) {
        filters.push({ field: "academicYear", operator: "contains", value: next.academicYear });
      }
      if (next.type) filters.push({ field: "type", operator: "eq", value: next.type });
      if (next.active) {
        filters.push({ field: "isActive", operator: "eq", value: next.active === "true" });
      }
      setFilters(filters, "replace");
    },
    [setFilters]
  );

  const handleSetActive = useCallback(
    (id: string) => {
      void httpClient
        .post("/terms/set-active", { id })
        .then(() => {
          notify?.({ type: "success", message: "Tahun ajaran aktif diperbarui" });
          void tableQueryResult?.refetch();
        })
        .catch(() => notify?.({ type: "error", message: "Gagal mengaktifkan tahun ajaran" }));
    },
    [notify, tableQueryResult]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteOne(
        { resource: "terms", id },
        {
          onSuccess: () => {
            notify?.({ type: "success", message: "Tahun ajaran dihapus" });
            void tableQueryResult?.refetch();
          },
          onError: () => notify?.({ type: "error", message: "Gagal menghapus tahun ajaran" }),
        }
      );
    },
    [deleteOne, notify, tableQueryResult]
  );

  const columns = useMemo<ColumnsType<TermRecord>>(
    () => [
      {
        title: "Nama Tahun Ajaran",
        dataIndex: "name",
        key: "name",
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            {isActiveTerm(record) ? <Tag color="green">Aktif</Tag> : null}
          </Space>
        ),
      },
      {
        title: "Tahun Ajaran",
        dataIndex: "academicYear",
        key: "academicYear",
        width: 150,
      },
      {
        title: "Jenis",
        dataIndex: "type",
        key: "type",
        width: 140,
        render: (value?: string) => value ?? "SEMESTER",
      },
      {
        title: "Periode",
        key: "period",
        width: 250,
        render: (_, record) => `${formatDate(record.startDate)} – ${formatDate(record.endDate)}`,
      },
      {
        title: "Aksi",
        key: "actions",
        width: 300,
        render: (_, record) => (
          <Space wrap>
            <Button icon={<EditOutlined />} onClick={() => edit("terms", record.id)}>
              Ubah
            </Button>
            {!isActiveTerm(record) ? (
              <Button icon={<StarFilled />} onClick={() => handleSetActive(record.id)}>
                Jadikan Aktif
              </Button>
            ) : null}
            <Popconfirm
              title="Hapus tahun ajaran?"
              description="Data aktif atau yang memiliki jadwal tidak dapat dihapus."
              okText="Hapus"
              cancelText="Batal"
              onConfirm={() => handleDelete(record.id)}
              disabled={isActiveTerm(record)}
            >
              <Button danger loading={isDeleting} disabled={isActiveTerm(record)}>
                Hapus
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [edit, handleDelete, handleSetActive, isDeleting]
  );

  return (
    <ResourceActionGuard action="list" resourceName="terms">
      <RefineList
        title="Tahun Ajaran"
        headerButtons={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => create("terms")}>
            Tambah Tahun Ajaran
          </Button>
        }
      >
        <Space wrap style={{ width: "100%", marginBottom: 16 }}>
          <DatePicker.RangePicker
            picker="year"
            placeholder={["Tahun mulai", "Tahun akhir"]}
            onChange={(range) => {
              const value = range?.[0]?.year();
              const next = value ? String(value) : "";
              setAcademicYear(next);
              applyFilters({ academicYear: next, type, active });
            }}
          />
          <Select
            allowClear
            value={type}
            options={TERM_TYPES.map((value) => ({ value, label: value }))}
            placeholder="Jenis"
            style={{ width: 160 }}
            onChange={(value) => {
              setType(value);
              applyFilters({ academicYear, type: value, active });
            }}
          />
          <Select
            allowClear
            value={active}
            options={[
              { value: "true", label: "Aktif" },
              { value: "false", label: "Tidak aktif" },
            ]}
            placeholder="Status"
            style={{ width: 150 }}
            onChange={(value) => {
              setActive(value);
              applyFilters({ academicYear, type, active: value });
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setAcademicYear("");
              setType(undefined);
              setActive(undefined);
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
          locale={{ emptyText: "Belum ada tahun ajaran" }}
        />
      </RefineList>
    </ResourceActionGuard>
  );
};
