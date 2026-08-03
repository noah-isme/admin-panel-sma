import React, { useMemo } from "react";
import { Create, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { Alert, Card, Form, Input, Select, Space, Typography } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
] as const;

export const SchedulesCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const { open: notify } = useAppNotification();

  const classSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { current: 1, pageSize: 500 },
  });
  const classesQuery = useList({
    resource: "classes",
    pagination: { current: 1, pageSize: 500 },
  });
  const subjectsQuery = useList({
    resource: "subjects",
    pagination: { current: 1, pageSize: 500 },
  });
  const teachersQuery = useList({
    resource: "teachers",
    pagination: { current: 1, pageSize: 500 },
  });

  const classSubjects = (classSubjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];
  const subjects = (subjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const teachers = (teachersQuery.data?.data as Record<string, any>[]) ?? [];

  const classSubjectOptions = useMemo(
    () =>
      classSubjects.map((mapping) => {
        const classroom = classes.find((cls) => cls.id === mapping.classroomId);
        const subject = subjects.find((sub) => sub.id === mapping.subjectId);
        const teacher = teachers.find((tch) => tch.id === mapping.teacherId);
        return {
          value: mapping.id,
          label: `${subject?.name ?? "Mapel"} · ${classroom?.name ?? "Kelas"}${
            teacher ? ` · ${teacher.fullName}` : ""
          }`,
        };
      }),
    [classSubjects, classes, subjects, teachers]
  );

  const handleFinishFailed = () => {
    notify?.({
      type: "warning",
      message: "Validasi gagal",
      description: "Pastikan seluruh kolom jadwal telah diisi dengan benar.",
    });
  };

  return (
    <ResourceActionGuard action="create">
      <Create
        saveButtonProps={saveButtonProps}
        title="Buat Jadwal Pelajaran"
        onFinishFailed={handleFinishFailed}
      >
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="Kelas & Mapel"
              name="classSubjectId"
              rules={[{ required: true, message: "Pilih kelas dan mapel." }]}
            >
              <Select
                showSearch
                placeholder="Pilih kelas · mapel · pengajar"
                options={classSubjectOptions}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              label="Hari"
              name="dayOfWeek"
              rules={[{ required: true, message: "Pilih hari pelaksanaan." }]}
            >
              <Select placeholder="Pilih hari" options={DAY_OPTIONS} />
            </Form.Item>

            <Form.Item
              label="Jam Mulai (HH:MM)"
              name="startTime"
              rules={[
                { required: true, message: "Jam mulai wajib diisi." },
                {
                  pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
                  message: "Format jam harus HH:MM (24 jam).",
                },
              ]}
            >
              <Input placeholder="07:30" maxLength={5} />
            </Form.Item>

            <Form.Item
              label="Jam Selesai (HH:MM)"
              name="endTime"
              rules={[
                { required: true, message: "Jam selesai wajib diisi." },
                {
                  pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
                  message: "Format jam harus HH:MM (24 jam).",
                },
              ]}
            >
              <Input placeholder="09:00" maxLength={5} />
            </Form.Item>

            <Form.Item
              label="Ruang"
              name="room"
              rules={[{ required: true, message: "Masukkan informasi ruang kelas." }]}
            >
              <Input placeholder="Misal: Ruang 101" maxLength={60} />
            </Form.Item>

            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">
                Pastikan jadwal tidak berbenturan dengan mata pelajaran lain untuk guru maupun kelas
                yang sama.
              </Typography.Text>
              <Typography.Text type="secondary">
                Format jam mengikuti standar 24 jam, contoh: 07:00, 09:30.
              </Typography.Text>
            </Space>

            {classSubjects.length === 0 ? (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                message="Mapping kelas-mapel belum tersedia"
                description="Tambahkan data Class Subject terlebih dahulu agar jadwal dapat dihubungkan."
              />
            ) : null}
          </Form>
        </Card>
      </Create>
    </ResourceActionGuard>
  );
};
