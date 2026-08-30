import { useList } from "../hooks/use-refine-list";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  List,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCreate, useDelete } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { ResourceActionGuard } from "../components/resource-action-guard";

const CATEGORY_COLORS: Record<string, string> = {
  Prestasi: "green",
  Kedisiplinan: "orange",
  BK: "volcano",
};

export const BehaviorNotesPage: React.FC = () => {
  const [classFilter, setClassFilter] = useState<string | undefined>(undefined);
  const { open: notify } = useAppNotification();
  const { mutateAsync: createNote } = useCreate();
  const { mutateAsync: deleteNote } = useDelete();

  const migratedClassesQuery = useList({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const migratedStudentsQuery = useList({
    resource: "students",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const studentsQuery = {
    ...migratedStudentsQuery.result,
    ...migratedStudentsQuery.query,
    ...migratedStudentsQuery,
  };

  const migratedBehaviorNotesQuery = useList({
    resource: "behavior-notes",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const behaviorNotesQuery = {
    ...migratedBehaviorNotesQuery.result,
    ...migratedBehaviorNotesQuery.query,
    ...migratedBehaviorNotesQuery,
  };

  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];
  const students = (studentsQuery.data?.data as Record<string, any>[]) ?? [];
  const behaviorNotes = (behaviorNotesQuery.data?.data as Record<string, any>[]) ?? [];

  const filteredNotes = useMemo(() => {
    if (!classFilter) return behaviorNotes;
    return behaviorNotes.filter((note) => note.classroomId === classFilter);
  }, [behaviorNotes, classFilter]);

  const handleSubmit = async (values: {
    classroomId: string;
    studentId: string;
    date: any;
    category: string;
    note: string;
  }) => {
    try {
      await createNote({
        resource: "behavior-notes",
        values: {
          ...values,
          date: values.date
            ? dayjs(values.date).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),
        },
      });
      notify?.({ type: "success", message: "Catatan tersimpan" });
      await behaviorNotesQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal menyimpan catatan", description: String(error) });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote({ resource: "behavior-notes", id });
      notify?.({ type: "success", message: "Catatan dihapus" });
      await behaviorNotesQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal menghapus catatan", description: String(error) });
    }
  };

  return (
    <ResourceActionGuard action="list" resourceName="behavior-notes">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Catatan Perilaku Siswa
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Catat kejadian penting terkait perilaku siswa dan tandai berdasarkan kategori. Catatan
            tampil untuk wali kelas dan kepala sekolah sesuai akses.
          </Typography.Paragraph>

          <Card title="Tambah Catatan">
            <Form layout="vertical" onFinish={handleSubmit} requiredMark="optional">
              <Form.Item
                label="Kelas"
                name="classroomId"
                rules={[{ required: true, message: "Pilih kelas" }]}
              >
                <Select
                  showSearch
                  placeholder="Pilih kelas"
                  options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              <Form.Item
                label="Siswa"
                name="studentId"
                rules={[{ required: true, message: "Pilih siswa" }]}
              >
                <Select
                  showSearch
                  placeholder="Pilih siswa"
                  options={students.map((student) => ({
                    value: student.id,
                    label: student.fullName,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              <Form.Item label="Tanggal" name="date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Kategori"
                name="category"
                rules={[{ required: true, message: "Pilih kategori" }]}
              >
                <Select
                  placeholder="Pilih kategori"
                  options={[
                    { label: "Kedisiplinan", value: "Kedisiplinan" },
                    { label: "Prestasi", value: "Prestasi" },
                    { label: "BK", value: "BK" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label="Catatan"
                name="note"
                rules={[{ required: true, message: "Catatan tidak boleh kosong" }]}
              >
                <Input.TextArea
                  placeholder="Tuliskan catatan perilaku"
                  autoSize={{ minRows: 2, maxRows: 5 }}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Simpan Catatan
              </Button>
            </Form>
          </Card>

          <Card
            title="Catatan Terbaru"
            extra={
              <Select
                allowClear
                placeholder="Filter kelas"
                value={classFilter}
                onChange={(value) => setClassFilter(value)}
                style={{ width: 220 }}
                options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              />
            }
          >
            {filteredNotes.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Belum ada catatan"
                description="Catatan perilaku akan muncul di sini setelah ditambahkan."
              />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={filteredNotes}
                renderItem={(item) => {
                  const student = students.find((std) => std.id === item.studentId);
                  const classroom = classes.find((cls) => cls.id === item.classroomId);
                  return (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button key="delete" onClick={() => handleDelete(item.id)} danger>
                          Hapus
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={8}>
                            <Typography.Text strong>{student?.fullName ?? "Siswa"}</Typography.Text>
                            <Tag>{classroom?.name ?? "Kelas"}</Tag>
                            <Tag color={CATEGORY_COLORS[item.category] ?? "blue"}>
                              {item.category}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Typography.Text type="secondary">
                            {dayjs(item.date).format("DD MMM YYYY")}
                          </Typography.Text>
                        }
                      />
                      <Typography.Paragraph>{item.note}</Typography.Paragraph>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
