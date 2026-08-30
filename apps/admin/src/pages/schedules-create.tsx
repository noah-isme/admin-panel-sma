import { useList } from "../hooks/use-refine-list";
import React, { useMemo } from "react";
import { Create, useForm } from "@refinedev/antd";
import { useAppNotification } from "../hooks/use-app-notification";
import { Alert, Card, Form, Input, Select, Space, Typography } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { isTermActive } from "../utils/terms";

const DAY_OPTIONS = [
  { value: "MONDAY", label: "Senin" },
  { value: "TUESDAY", label: "Selasa" },
  { value: "WEDNESDAY", label: "Rabu" },
  { value: "THURSDAY", label: "Kamis" },
  { value: "FRIDAY", label: "Jumat" },
  { value: "SATURDAY", label: "Sabtu" },
];

const DAY_INT_TO_NAME: Record<string, string> = {
  "1": "MONDAY",
  "2": "TUESDAY",
  "3": "WEDNESDAY",
  "4": "THURSDAY",
  "5": "FRIDAY",
  "6": "SATURDAY",
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
};

export const SchedulesCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const { open: notify } = useAppNotification();

  const migratedClassSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const classSubjectsQuery = {
    ...migratedClassSubjectsQuery.result,
    ...migratedClassSubjectsQuery.query,
    ...migratedClassSubjectsQuery,
  };

  const migratedClassesQuery = useList({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const migratedSubjectsQuery = useList({
    resource: "subjects",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const subjectsQuery = {
    ...migratedSubjectsQuery.result,
    ...migratedSubjectsQuery.query,
    ...migratedSubjectsQuery,
  };

  const migratedTeachersQuery = useList({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const teachersQuery = {
    ...migratedTeachersQuery.result,
    ...migratedTeachersQuery.query,
    ...migratedTeachersQuery,
  };

  const migratedTermsQuery = useList({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const classSubjects = (classSubjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];
  const subjects = (subjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const teachers = (teachersQuery.data?.data as Record<string, any>[]) ?? [];
  const terms = (migratedTermsQuery.result?.data as Record<string, any>[]) ?? [];
  const activeTerm = terms.find(isTermActive) ?? terms[0];

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

  const handleFinish = (values: any) => {
    const mapping = classSubjects.find((m) => m.id === values.classSubjectId);
    const dayOfWeekName =
      DAY_INT_TO_NAME[values.dayOfWeek] || String(values.dayOfWeek).toUpperCase();
    const timeSlot =
      values.startTime && values.endTime
        ? `${values.startTime}-${values.endTime}`
        : values.timeSlot || "07:30-09:00";

    const payload = {
      ...values,
      termId: mapping?.termId || activeTerm?.id || "term-2025-1",
      classId: mapping?.classroomId || values.classId,
      subjectId: mapping?.subjectId || values.subjectId,
      teacherId: mapping?.teacherId || values.teacherId,
      dayOfWeek: dayOfWeekName,
      timeSlot,
    };

    return formProps.onFinish?.(payload);
  };

  return (
    <ResourceActionGuard action="create">
      <Create saveButtonProps={saveButtonProps} title="Buat Jadwal Pelajaran">
        <Card>
          <Form
            {...formProps}
            onFinish={handleFinish}
            onFinishFailed={handleFinishFailed}
            layout="vertical"
          >
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
