import React, { useCallback, useMemo, useState } from "react";
import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { List, useTable } from "@refinedev/antd";
import { useDelete, useNavigation } from "@refinedev/core";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { useAppNotification } from "../hooks/use-app-notification";

type SubjectRecord = {
  id: string;
  code: string;
  name: string;
  track?: string;
  tracks?: string[];
  group?: string;
  subjectGroup?: string;
  description?: string;
};

const TRACK_OPTIONS = [
  { value: "ALL", label: "Semua jalur" },
  { value: "IPA", label: "IPA" },
  { value: "IPS", label: "IPS" },
];

const GROUP_OPTIONS = [
  { value: "CORE", label: "Wajib" },
  { value: "DIFFERENTIATED", label: "Peminatan" },
  { value: "ELECTIVE", label: "Pilihan" },
];

const displayTrack = (record: SubjectRecord) => {
  if (record.track) return record.track;
  if (record.tracks?.length) return record.tracks.join(", ");
  return "Semua";
};

const displayGroup = (record: SubjectRecord) => record.subjectGroup ?? record.group ?? "–";

export const SubjectsPage: React.FC = () => {
  const { create, edit } = useNavigation();
  const { open: notify } = useAppNotification();
  const {
    mutate: deleteOne,
    mutation: { isPending: isDeleting },
  } = useDelete();
  const {
    tableProps,
    setFilters,
    tableQuery: tableQueryResult,
  } = useTable<SubjectRecord>({
    resource: "subjects",
    pagination: { currentPage: 1, pageSize: 20 },
  });
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState<string>();
  const [group, setGroup] = useState<string>();

  const applyFilters = useCallback(
    (next: { search?: string; track?: string; group?: string }) => {
      const filters = [] as Array<{
        field: string;
        operator: "contains" | "eq";
        value: string;
      }>;
      if (next.search) filters.push({ field: "search", operator: "contains", value: next.search });
      if (next.track && next.track !== "ALL") {
        filters.push({ field: "track", operator: "eq", value: next.track });
      }
      if (next.group) filters.push({ field: "group", operator: "eq", value: next.group });
      setFilters(filters, "replace");
    },
    [setFilters]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteOne(
        { resource: "subjects", id },
        {
          onSuccess: () => {
            notify?.({ type: "success", message: "Mata pelajaran dihapus" });
            void tableQueryResult?.refetch();
          },
          onError: () => notify?.({ type: "error", message: "Gagal menghapus mata pelajaran" }),
        }
      );
    },
    [deleteOne, notify, tableQueryResult]
  );

  const columns = useMemo<ColumnsType<SubjectRecord>>(
    () => [
      {
        title: "Kode",
        dataIndex: "code",
        key: "code",
        width: 140,
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: "Nama Mata Pelajaran",
        dataIndex: "name",
        key: "name",
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            {record.description ? (
              <Typography.Text type="secondary" ellipsis>
                {record.description}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Kelompok",
        key: "group",
        width: 160,
        render: (_, record) => <Tag>{displayGroup(record)}</Tag>,
      },
      {
        title: "Jalur",
        key: "track",
        width: 160,
        render: (_, record) => displayTrack(record),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 190,
        render: (_, record) => (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => edit("subjects", record.id)}>
              Ubah
            </Button>
            <Button danger loading={isDeleting} onClick={() => handleDelete(record.id)}>
              Hapus
            </Button>
          </Space>
        ),
      },
    ],
    [edit, handleDelete, isDeleting]
  );

  return (
    <ResourceActionGuard action="list" resourceName="subjects">
      <List
        title="Mata Pelajaran"
        headerButtons={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => create("subjects")}>
            Tambah Mata Pelajaran
          </Button>
        }
      >
        <Space wrap style={{ width: "100%", marginBottom: 16 }}>
          <Input.Search
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => applyFilters({ search: value.trim(), track, group })}
            placeholder="Cari kode atau nama"
            style={{ width: 280 }}
          />
          <Select
            allowClear
            value={track}
            options={TRACK_OPTIONS}
            placeholder="Jalur"
            style={{ width: 160 }}
            onChange={(value) => {
              setTrack(value);
              applyFilters({ search, track: value, group });
            }}
          />
          <Select
            allowClear
            value={group}
            options={GROUP_OPTIONS}
            placeholder="Kelompok"
            style={{ width: 180 }}
            onChange={(value) => {
              setGroup(value);
              applyFilters({ search, track, group: value });
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearch("");
              setTrack(undefined);
              setGroup(undefined);
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
          locale={{ emptyText: "Belum ada mata pelajaran" }}
        />
      </List>
    </ResourceActionGuard>
  );
};
