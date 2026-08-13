import React, { useCallback, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Input, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { List, useTable } from "@refinedev/antd";
import { useDelete, useNavigation } from "@refinedev/core";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { useAppNotification } from "../hooks/use-app-notification";

type GradeComponentRecord = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
};
export const GradeComponentsPage: React.FC = () => {
  const { create, edit } = useNavigation();
  const { open: notify } = useAppNotification();
  const { mutate: deleteOne, isLoading: isDeleting } = useDelete();
  const { tableProps, setFilters, tableQueryResult } = useTable<GradeComponentRecord>({
    resource: "grade-components",
    pagination: { current: 1, pageSize: 20 },
  });
  const [search, setSearch] = useState("");

  const applySearch = useCallback(
    (value: string) => {
      const next = value.trim();
      setSearch(value);
      setFilters(next ? [{ field: "search", operator: "contains", value: next }] : [], "replace");
    },
    [setFilters]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteOne(
        { resource: "grade-components", id },
        {
          onSuccess: () => {
            notify?.({ type: "success", message: "Komponen nilai dihapus" });
            void tableQueryResult?.refetch();
          },
          onError: () => notify?.({ type: "error", message: "Gagal menghapus komponen nilai" }),
        }
      );
    },
    [deleteOne, notify, tableQueryResult]
  );

  const columns = useMemo<ColumnsType<GradeComponentRecord>>(
    () => [
      {
        title: "Kode",
        dataIndex: "code",
        key: "code",
        width: 160,
        render: (value?: string) => <Typography.Text strong>{value ?? "–"}</Typography.Text>,
      },
      {
        title: "Nama Komponen",
        dataIndex: "name",
        key: "name",
        width: 280,
      },
      {
        title: "Deskripsi",
        dataIndex: "description",
        key: "description",
        render: (value?: string | null) =>
          value || <Typography.Text type="secondary">–</Typography.Text>,
      },
      {
        title: "Aksi",
        key: "actions",
        width: 220,
        render: (_, record) => (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => edit("grade-components", record.id)}>
              Ubah
            </Button>
            <Popconfirm
              title="Hapus komponen nilai?"
              description="Komponen akan dihapus secara lunak agar riwayat nilai tetap tersedia."
              okText="Hapus"
              cancelText="Batal"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger icon={<DeleteOutlined />} loading={isDeleting}>
                Hapus
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [edit, handleDelete, isDeleting]
  );

  return (
    <ResourceActionGuard action="list" resourceName="grade-components">
      <List
        title="Komponen Nilai"
        headerButtons={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => create("grade-components")}>
            Tambah Komponen
          </Button>
        }
      >
        <Space style={{ width: "100%", marginBottom: 16 }} wrap>
          <Input.Search
            allowClear
            value={search}
            placeholder="Cari kode atau nama"
            style={{ width: 300 }}
            onChange={(event) => {
              setSearch(event.target.value);
              if (!event.target.value) applySearch("");
            }}
            onSearch={applySearch}
          />
          <Button icon={<ReloadOutlined />} onClick={() => applySearch("")}>
            Reset
          </Button>
        </Space>
        <Table
          {...tableProps}
          rowKey="id"
          columns={columns}
          loading={tableProps.loading || isDeleting}
          locale={{ emptyText: "Belum ada komponen nilai" }}
        />
      </List>
    </ResourceActionGuard>
  );
};
